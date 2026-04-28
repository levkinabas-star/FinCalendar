import { useState, useMemo, lazy, Suspense } from 'react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Pencil, Trash2, RotateCcw,
  ChevronRight, RefreshCw, Plus, Settings, Star, BarChart2,
  CalendarDays, PiggyBank,
} from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { formatAmount, getUpcomingExpenses } from '../utils';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import TransferForm from '../components/TransferForm';
import EditDebtPaymentForm from '../components/EditDebtPaymentForm';
import PlannedExpenseForm from '../components/PlannedExpenseForm';
import UpcomingRow from '../components/UpcomingRow';
import { Transaction, Debt, DebtPayment, PlannedExpense } from '../types';
import { useAddTransaction } from '../contexts/AddTransactionContext';

const Calendar = lazy(() => import('../pages/Calendar'));
const Statistics = lazy(() => import('../pages/Statistics'));
const Budgets = lazy(() => import('../pages/Budgets'));
const Settings_ = lazy(() => import('../pages/Settings'));

type RightTab = 'calendar' | 'statistics' | 'budgets';

const C = {
  bg: '#07070F',
  card: '#111827',
  surface: '#1E293B',
  field: '#1E293B',
  border: '#1E3A5F',
  text: '#F1F5F9',
  muted: '#94A3B8',
  dim: '#64748B',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  // Glass / Frosted tokens
  glassCard: 'rgba(17,24,39,0.7)',
  glassBorder: 'rgba(59,130,246,0.15)',
  glassShine: 'rgba(255,255,255,0.05)',
  glowBlue: 'rgba(59,130,246,0.25)',
  glowGreen: 'rgba(16,185,129,0.2)',
  glowRed: 'rgba(239,68,68,0.2)',
  shadowCard: '0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)',
  shadowElevated: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)',
  shadowGlowBlue: '0 0 20px rgba(59,130,246,0.2)',
};

export default function DesktopTwoColumn() {
  const {
    language, accounts, transactions, categories, plannedExpenses, defaultCurrency,
    deleteTransaction, addTransaction, deletePlannedExpense, budgets, debts,
    deleteDebtPayment, revertDebtPaymentToScheduled, togglePlannedCompleted,
    markPlannedCompletedNoDeduction, markScheduledCompletedNoDeduction,
    unmarkScheduledCompleted, markScheduledAsPaid, plan,
  } = useStore();
  const t = translations[language];
  const { openAdd } = useAddTransaction();
  const isRu = language === 'ru';

  // Right column tab
  const [rightTab, setRightTab] = useState<RightTab>('calendar');
  // Settings overlay
  const [showSettings, setShowSettings] = useState(false);

  // Left column modals
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(null);
  const [editingPe, setEditingPe] = useState<PlannedExpense | null>(null);
  const [editingDebtPayment, setEditingDebtPayment] = useState<{ payment: DebtPayment; debt: Debt } | null>(null);
  const [deletingDebtPayment, setDeletingDebtPayment] = useState<{ debtId: string; paymentId: string } | null>(null);
  const [reversingTx, setReversingTx] = useState<Transaction | null>(null);
  const [deletingPe, setDeletingPe] = useState<{ id: string; date: string } | null>(null);
  const [revertingDebtPayment, setRevertingDebtPayment] = useState<{ debtId: string; paymentId: string } | null>(null);
  const [showAllTx, setShowAllTx] = useState(false);

  // ── Data computation ──
  const now = useMemo(() => new Date(), []);
  const { monthStart, monthEnd, monthStartStr, monthEndStr } = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { monthStart: start, monthEnd: end, monthStartStr: format(start, 'yyyy-MM-dd'), monthEndStr: format(end, 'yyyy-MM-dd') };
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
      for (const d of pe.completedDates) {
        if (d >= monthStartStr && d <= monthEndStr) {
          if (pe.type === 'income') incAmt += pe.amount;
          else expAmt += pe.amount;
        }
      }
    }
    return { completedExpenseAmt: expAmt, completedIncomeAmt: incAmt };
  }, [plannedExpenses, monthStartStr, monthEndStr]);

  const totalMonthExpense = monthExpense + completedExpenseAmt;
  const totalMonthIncome = monthIncome + completedIncomeAmt;
  const netMonth = totalMonthIncome - totalMonthExpense;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const todayStr = format(now, 'yyyy-MM-dd');
  const upcomingPlanned = useMemo(() => getUpcomingExpenses(plannedExpenses, 30), [plannedExpenses]);
  const upcomingDebtPayments = useMemo(() =>
    debts.filter((d) => d.status === 'active')
      .flatMap((d) => d.scheduledPayments
        .filter((sp) => sp.dueDate >= todayStr && !sp.paidDate && !sp.completedDates?.includes(sp.dueDate))
        .map((sp) => ({ debt: d, payment: sp })))
      .sort((a, b) => a.payment.dueDate.localeCompare(b.payment.dueDate)),
    [debts, todayStr]);

  const upcoming = useMemo(() => [
    ...upcomingPlanned.map((u) => ({ kind: 'planned' as const, expense: u.expense, date: u.date })),
    ...upcomingDebtPayments.map((u) => ({ kind: 'debt' as const, payment: u.payment, debt: u.debt, date: u.payment.dueDate })),
  ].sort((a, b) => a.date.localeCompare(b.date)), [upcomingPlanned, upcomingDebtPayments]);

  const activeDebts = useMemo(() => debts.filter((d) => d.status === 'active'), [debts]);
  const totalLent = useMemo(() => activeDebts.filter((d) => d.direction === 'lent').reduce((s, d) => s + (d.amount - d.paidAmount), 0), [activeDebts]);
  const totalBorrowed = useMemo(() => activeDebts.filter((d) => d.direction === 'borrowed').reduce((s, d) => s + (d.amount - d.paidAmount), 0), [activeDebts]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const getCat = (id: string) => catMap.get(id);
  const getAcc = (id: string) => accMap.get(id);

  const sortedTx = useMemo(() => [...transactions]
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
    .sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt)),
    [transactions]);

  const allDebtPayments = useMemo(() => debts.flatMap((d) => d.payments.map((p) => ({ payment: p, debt: d }))), [debts]);
  const allPlannedCompleted = useMemo(() => plannedExpenses.flatMap((pe) => pe.completedDates.map((d) => ({ expense: pe, date: d }))), [plannedExpenses]);

  type UnifiedItem =
    | { kind: 'tx'; tx: Transaction; date: string; sortKey: string }
    | { kind: 'dp'; payment: DebtPayment; debt: Debt; date: string; sortKey: string }
    | { kind: 'pe'; expense: PlannedExpense; date: string; sortKey: string };

  const unifiedSorted = useMemo<UnifiedItem[]>(() => [
    ...sortedTx.map((tx): UnifiedItem => ({ kind: 'tx', tx, date: tx.date, sortKey: tx.date + tx.createdAt })),
    ...allDebtPayments.map(({ payment, debt }): UnifiedItem => ({ kind: 'dp', payment, debt, date: payment.date, sortKey: payment.date + payment.id })),
    ...allPlannedCompleted.map(({ expense, date }): UnifiedItem => ({ kind: 'pe', expense, date, sortKey: date + expense.id })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey)), [sortedTx, allDebtPayments, allPlannedCompleted]);

  const TX_LIMIT = 25;
  const displayTx = showAllTx ? unifiedSorted : unifiedSorted.slice(0, TX_LIMIT);
  const grouped = useMemo(() => {
    const map = new Map<string, UnifiedItem[]>();
    for (const item of displayTx) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return Array.from(map.entries());
  }, [displayTx]);

  const formatDateLabel = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return t.today;
    if (isYesterday(d)) return isRu ? 'Вчера' : 'Yesterday';
    return format(d, isRu ? 'd MMM yyyy' : 'MMM d, yyyy');
  };

  const tabDefs: { id: RightTab; label: string; icon: React.ReactNode; color: string; glow: string }[] = [
    { id: 'calendar', label: isRu ? 'Календарь' : 'Calendar', icon: <CalendarDays size={14} />, color: C.blue, glow: C.glowBlue },
    { id: 'statistics', label: isRu ? 'Статистика' : 'Statistics', icon: <BarChart2 size={14} />, color: C.purple, glow: 'rgba(139,92,246,0.25)' },
    { id: 'budgets', label: isRu ? 'Бюджеты' : 'Budgets', icon: <PiggyBank size={14} />, color: C.green, glow: C.glowGreen },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, overflow: 'hidden' }}>

      {/* ══════════════ HEADER ══════════════ */}
      <header style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: `1px solid ${C.glassBorder}`, flexShrink: 0, gap: 12, backdropFilter: 'blur(12px)', background: 'rgba(7,7,15,0.8)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/icon-192.png" alt="FinCalendar" style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, objectFit: 'cover' }} />
          <div>
            <span style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>FinCalendar</span>
            {plan === 'pro' && (
              <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, color: C.amber, letterSpacing: '0.12em', background: 'rgba(245,158,11,0.15)', padding: '2px 7px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)' }}>PRO</span>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Balance chip — frosted glass card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px', borderRadius: 14, background: C.glassCard, border: `1px solid ${C.glassBorder}`, backdropFilter: 'blur(16px)', boxShadow: C.shadowCard }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.totalBalance}</p>
            <p style={{ color: totalBalance >= 0 ? C.text : C.red, fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>
              {formatAmount(totalBalance, defaultCurrency as any)}
            </p>
          </div>
          <div style={{ width: 1, height: 32, background: C.glassBorder }} />
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: C.muted, fontSize: 10 }}>{t.income}</p>
              <p style={{ color: C.green, fontSize: 13, fontWeight: 700 }}>+{formatAmount(totalMonthIncome, defaultCurrency as any)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: C.muted, fontSize: 10 }}>{t.expenses}</p>
              <p style={{ color: C.red, fontSize: 13, fontWeight: 700 }}>-{formatAmount(totalMonthExpense, defaultCurrency as any)}</p>
            </div>
          </div>
        </div>

        {plan !== 'pro' && (
          <button
            onClick={() => setRightTab('budgets')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: `1px solid rgba(245,158,11,0.3)`, color: C.amber, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 12px rgba(245,158,11,0.1)' }}
          >
            <Star size={13} fill={C.amber} color={C.amber} />
            Pro
          </button>
        )}

        <button
          onClick={() => setShowSettings(true)}
          style={{ width: 36, height: 36, borderRadius: 11, background: C.glassCard, border: `1px solid ${C.glassBorder}`, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: C.shadowCard }}
          title={t.settings}
        >
          <Settings size={17} color={C.muted} />
        </button>
      </header>

      {/* ══════════════ TWO COLUMNS ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '42fr 58fr', flex: 1, overflow: 'hidden' }}>

        {/* ════ LEFT COLUMN ════ */}
        <div style={{ borderRight: `1px solid ${C.glassBorder}`, overflowY: 'auto', overflowX: 'hidden', background: 'linear-gradient(180deg, rgba(7,7,15,1) 0%, rgba(11,15,28,1) 100%)' }}>
          <div style={{ padding: '20px 22px 48px' }}>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
              <ActionButton
                label={isRu ? '+ Доход' : '+ Income'}
                color={C.green}
                bg="linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))"
                border="rgba(16,185,129,0.35)"
                icon={<TrendingUp size={14} />}
                onClick={() => openAdd('income')}
              />
              <ActionButton
                label={isRu ? '↔ Перевод' : 'Transfer'}
                color={C.blue}
                bg="linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))"
                border="rgba(59,130,246,0.35)"
                icon={<ArrowLeftRight size={14} />}
                onClick={() => openAdd('transfer')}
              />
              <ActionButton
                label={isRu ? '− Расход' : '− Expense'}
                color={C.red}
                bg="linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))"
                border="rgba(239,68,68,0.35)"
                icon={<TrendingDown size={14} />}
                onClick={() => openAdd('expense')}
              />
            </div>

            {/* Balance card */}
            <div style={{ borderRadius: 20, padding: '20px 22px', marginBottom: 22, background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))', border: `1px solid ${C.glassBorder}`, backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden', boxShadow: C.shadowElevated }}>
              {/* Ambient glow blobs */}
              <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: -20, bottom: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)', pointerEvents: 'none' }} />
              {/* Top badge */}
              {netMonth < 0 && (
                <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: `1px solid rgba(239,68,68,0.3)`, boxShadow: '0 0 12px rgba(239,68,68,0.15)' }}>
                  <TrendingDown size={11} color={C.red} />
                  <span style={{ color: C.red, fontSize: 10, fontWeight: 700 }}>{isRu ? 'Расходы > доходов' : 'Expenses > income'}</span>
                </div>
              )}
              <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>{t.totalBalance}</p>
              <p style={{ color: totalBalance >= 0 ? C.text : C.red, fontSize: 30, fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
                {formatAmount(totalBalance, defaultCurrency as any)}
              </p>
              <div style={{ display: 'flex', gap: 20 }}>
                <MiniStat label={t.income} value={`+${formatAmount(totalMonthIncome, defaultCurrency as any)}`} color={C.green} icon={<TrendingUp size={13} color={C.green} />} />
                <MiniStat label={t.expenses} value={`-${formatAmount(totalMonthExpense, defaultCurrency as any)}`} color={C.red} icon={<TrendingDown size={13} color={C.red} />} />
                <MiniStat
                  label={isRu ? 'Итого' : 'Net'}
                  value={`${netMonth >= 0 ? '+' : '-'}${formatAmount(Math.abs(netMonth), defaultCurrency as any)}`}
                  color={netMonth >= 0 ? C.green : C.red}
                  icon={netMonth >= 0 ? <TrendingUp size={13} color={C.green} /> : <TrendingDown size={13} color={C.red} />}
                />
              </div>
            </div>

            {/* Accounts */}
            <SectionHeader
              title={t.accounts}
              right={<button onClick={() => {}} style={linkBtnStyle}>{t.seeAll} <ChevronRight size={12} /></button>}
            />
            {accounts.length === 0 ? (
              <EmptyCard icon="💳" text={isRu ? 'Нет счетов' : 'No accounts'} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px,1fr))', gap: 10, marginBottom: 22 }}>
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="active-scale"
                    style={{ padding: '14px 15px', borderRadius: 16, background: `linear-gradient(145deg, ${acc.color}14, ${acc.color}06)`, border: `1px solid ${acc.color}30`, cursor: 'pointer', boxShadow: `0 2px 12px ${acc.color}10`, backdropFilter: 'blur(8px)' }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{acc.icon}</div>
                    <p style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>{acc.name}</p>
                    <p style={{ color: acc.balance >= 0 ? C.text : C.red, fontSize: 15, fontWeight: 800 }}>
                      {formatAmount(acc.balance, acc.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Debts */}
            {activeDebts.length > 0 && (
              <>
                <SectionHeader
                  title={isRu ? 'Долги' : 'Debts'}
                  right={
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {totalLent > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: C.green, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: `${C.green}15` }}>▲ {formatAmount(totalLent, defaultCurrency as any)}</span>}
                      {totalBorrowed > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: C.red, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: `${C.red}15` }}>▼ {formatAmount(totalBorrowed, defaultCurrency as any)}</span>}
                    </div>
                  }
                />
                <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.glassBorder}`, marginBottom: 22, backdropFilter: 'blur(12px)', background: C.glassCard, boxShadow: C.shadowCard }}>
                  {activeDebts.slice(0, 5).map((debt, idx) => {
                    const isLent = debt.direction === 'lent';
                    const remaining = debt.amount - debt.paidAmount;
                    return (
                      <div key={debt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: idx % 2 === 0 ? 'rgba(17,24,39,0.4)' : 'rgba(17,24,39,0.2)', borderBottom: idx < Math.min(activeDebts.length, 5) - 1 ? `1px solid ${C.glassBorder}` : 'none' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 11, background: isLent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17, boxShadow: `0 0 10px ${isLent ? C.glowGreen : C.glowRed}` }}>
                          {isLent ? '💸' : '🤝'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: C.text, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{debt.personName}</p>
                          <p style={{ color: C.muted, fontSize: 11 }}>{isRu ? (isLent ? 'Должен мне' : 'Я должен') : (isLent ? 'Owes me' : 'I owe')}</p>
                        </div>
                        <span style={{ color: isLent ? C.green : C.red, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {isLent ? '+' : '-'}{formatAmount(remaining, debt.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Upcoming payments */}
            <SectionHeader
              title={isRu ? 'Ближайшие платежи' : 'Upcoming Payments'}
              right={upcoming.length > 0 ? <span style={{ ...labelStyle }}>{upcoming.length}</span> : undefined}
            />
            {upcoming.length === 0 ? (
              <EmptyCard icon="📅" text={isRu ? 'Нет предстоящих платежей' : 'No upcoming payments'} />
            ) : (
              <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.glassBorder}`, marginBottom: 22, backdropFilter: 'blur(12px)', background: C.glassCard, boxShadow: C.shadowCard }}>
                {upcoming.slice(0, 5).map((item, idx) => (
                  <UpcomingRow
                    key={item.kind === 'planned' ? `up-p-${item.expense.id}-${item.date}` : `up-d-${item.payment.id}`}
                    item={item as any}
                    idx={idx}
                    total={Math.min(upcoming.length, 5)}
                    getCat={getCat as any}
                    getAcc={getAcc as any}
                    language={language}
                    today={t.today}
                    showDaysUntil
                    onMarkNoDeduction={item.kind === 'planned' ? (id, date) => markPlannedCompletedNoDeduction(id, date) : undefined}
                    onTogglePlanned={item.kind === 'planned' ? (id, date) => togglePlannedCompleted(id, date) : undefined}
                    onEditPlanned={item.kind === 'planned' ? (expense) => setEditingPe(expense) : undefined}
                    onDeletePlanned={item.kind === 'planned' ? (id, date) => setDeletingPe({ id, date }) : undefined}
                    onToggleDebtScheduled={item.kind === 'debt' ? (debtId, scheduledId, date) => {
                      const sp = item.payment;
                      if (sp.completedDates?.includes(date)) unmarkScheduledCompleted(debtId, scheduledId, date);
                      else markScheduledCompletedNoDeduction(debtId, scheduledId, date);
                    } : undefined}
                    accounts={accounts}
                    onPayDebtScheduled={item.kind === 'debt' ? (debtId, scheduledId, accountId) => markScheduledAsPaid(debtId, scheduledId, accountId) : undefined}
                  />
                ))}
              </div>
            )}

            {/* Recent transactions */}
            <SectionHeader
              title={t.recentTransactions}
              right={unifiedSorted.length > TX_LIMIT ? (
                <button onClick={() => setShowAllTx((v) => !v)} style={linkBtnStyle}>
                  {showAllTx ? (isRu ? 'Свернуть' : 'Less') : `${isRu ? 'Все' : 'All'} (${unifiedSorted.length})`}
                </button>
              ) : undefined}
            />
            {unifiedSorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
                <p style={{ fontSize: 13 }}>{t.noTransactions}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {grouped.map(([dateStr, items]) => (
                  <div key={dateStr}>
                    <p style={{ color: C.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8, paddingLeft: 4 }}>
                      {formatDateLabel(dateStr)}
                    </p>
                    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.glassBorder}`, backdropFilter: 'blur(12px)', background: C.glassCard, boxShadow: C.shadowCard }}>
                      {items.map((item, idx) => {
                        const borderBottom = idx < items.length - 1 ? `1px solid ${C.border}` : 'none';

                        if (item.kind === 'dp') {
                          const { payment, debt } = item;
                          const isLent = debt.direction === 'lent';
                          const acc = getAcc(payment.accountId);
                          return (
                            <TxRow key={`dp-${payment.id}`} borderBottom={borderBottom}
                              icon={<span style={{ fontSize: 16 }}>{isLent ? '💸' : '🤝'}</span>}
                              iconBg={isLent ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}
                              title={debt.personName}
                              subtitle={`${isRu ? 'Долг' : 'Debt'}${payment.note ? ` · ${payment.note}` : ''}${acc ? ` · ${acc.name}` : ''}`}
                              amount={`${isLent ? '+' : '-'}${formatAmount(payment.amount, debt.currency)}`}
                              amountColor={isLent ? C.green : C.red}
                              actions={[
                                <Btn key="rev" onClick={() => setRevertingDebtPayment({ debtId: debt.id, paymentId: payment.id })}><RotateCcw size={12} color={C.amber} /></Btn>,
                                <Btn key="edit" onClick={() => setEditingDebtPayment({ payment, debt })}><Pencil size={12} color={C.muted} /></Btn>,
                                <Btn key="del" onClick={() => setDeletingDebtPayment({ debtId: debt.id, paymentId: payment.id })}><Trash2 size={12} color={C.red} /></Btn>,
                              ]}
                            />
                          );
                        }

                        if (item.kind === 'pe') {
                          const { expense: pe } = item;
                          const isIncome = pe.type === 'income';
                          const cat = getCat(pe.categoryId);
                          const acc = getAcc(pe.accountId);
                          return (
                            <TxRow key={`pe-${pe.id}-${item.date}`} borderBottom={borderBottom}
                              icon={<span style={{ fontSize: 16 }}>{cat?.icon ?? '🔁'}</span>}
                              iconBg={`${cat?.color ?? '#94A3B8'}22`}
                              title={pe.description || (isRu ? cat?.name : cat?.nameEn) || '—'}
                              subtitle={`${acc?.name ?? ''}${pe.recurring ? ' · 🔁' : ''}`}
                              amount={`${isIncome ? '+' : '-'}${formatAmount(pe.amount, pe.currency)}`}
                              amountColor={isIncome ? C.green : C.red}
                              actions={[
                                <Btn key="rev" onClick={() => togglePlannedCompleted(pe.id, item.date)}><RotateCcw size={12} color={C.amber} /></Btn>,
                                <Btn key="edit" onClick={() => setEditingPe(pe)}><Pencil size={12} color={C.muted} /></Btn>,
                                <Btn key="del" onClick={() => setDeletingPe({ id: pe.id, date: item.date })}><Trash2 size={12} color={C.red} /></Btn>,
                              ]}
                            />
                          );
                        }

                        const { tx } = item;
                        const isTransfer = tx.type === 'transfer';
                        const cat = getCat(tx.categoryId);
                        const acc = getAcc(tx.accountId);
                        const peerAcc = isTransfer && tx.transferPeerAccountId ? getAcc(tx.transferPeerAccountId) : null;
                        const txColor = isTransfer ? C.blue : tx.type === 'income' ? C.green : C.red;
                        const peerTx = isTransfer ? transactions.find((t) => t.id === tx.transferPeerId) : null;
                        return (
                          <TxRow key={`tx-${tx.id}`} borderBottom={borderBottom}
                            icon={isTransfer ? <ArrowLeftRight size={15} color={C.blue} /> : <span style={{ fontSize: 16 }}>{cat?.icon ?? '📌'}</span>}
                            iconBg={isTransfer ? 'rgba(59,130,246,0.15)' : `${cat?.color ?? '#94A3B8'}22`}
                            title={isTransfer ? `${acc?.name ?? '?'} → ${peerAcc?.name ?? '?'}` : (tx.description || (isRu ? cat?.name : cat?.nameEn) || '—')}
                            subtitle={isTransfer ? (tx.description || (isRu ? 'Перевод' : 'Transfer')) : (acc?.name ?? '')}
                            amount={`${isTransfer ? '-' : tx.type === 'income' ? '+' : '-'}${formatAmount(tx.amount, tx.currency)}`}
                            amountColor={txColor}
                            amountSub={isTransfer && peerTx && peerTx.currency !== tx.currency ? `+${formatAmount(peerTx.amount, peerTx.currency)}` : undefined}
                            actions={[
                              ...(!isTransfer ? [<Btn key="rev" onClick={() => setReversingTx(tx)}><RotateCcw size={12} color={C.amber} /></Btn>] : []),
                              <Btn key="edit" onClick={() => isTransfer ? setEditingTransfer(tx) : setEditingTx(tx)}><Pencil size={12} color={C.muted} /></Btn>,
                              <Btn key="del" onClick={() => setDeletingId(tx.id)}><Trash2 size={12} color={C.red} /></Btn>,
                            ]}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(7,7,15,1) 0%, rgba(11,15,28,1) 100%)' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 18px', borderBottom: `1px solid ${C.glassBorder}`, flexShrink: 0, background: 'rgba(7,7,15,0.6)', backdropFilter: 'blur(16px)' }}>
            {tabDefs.map((tab) => {
              const active = rightTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  className="active-scale"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 12,
                    border: `1px solid ${active ? tab.color : tab.color + '35'}`,
                    background: active ? `linear-gradient(135deg, ${tab.color}28, ${tab.color}10)` : `${tab.color}0D`,
                    color: active ? tab.color : tab.color + '99',
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', transition: 'all 0.2s',
                    backdropFilter: 'blur(12px)',
                    boxShadow: active ? `0 0 16px ${tab.glow}` : 'none',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: C.muted, fontSize: 14 }}>...</div>}>
              {rightTab === 'calendar' && <Calendar />}
              {rightTab === 'statistics' && <Statistics />}
              {rightTab === 'budgets' && <Budgets />}
            </Suspense>
          </div>
        </div>
      </div>

      {/* ══════════════ SETTINGS OVERLAY ══════════════ */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title={t.settings} fullHeight>
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: C.muted }}>...</div>}>
          <Settings_ />
        </Suspense>
      </Modal>

      {/* ══════════════ LEFT COLUMN MODALS ══════════════ */}

      <Modal isOpen={!!editingTx} onClose={() => setEditingTx(null)} title={isRu ? 'Редактировать операцию' : 'Edit Transaction'} fullHeight>
        {editingTx && <TransactionForm key={editingTx.id} editingTx={editingTx} onClose={() => setEditingTx(null)} />}
      </Modal>

      <Modal isOpen={!!editingTransfer} onClose={() => setEditingTransfer(null)} title={isRu ? 'Редактировать перевод' : 'Edit Transfer'} fullHeight>
        {editingTransfer && <TransferForm key={editingTransfer.id} editingTx={editingTransfer} onClose={() => setEditingTransfer(null)} />}
      </Modal>

      <Modal isOpen={!!editingPe} onClose={() => setEditingPe(null)} title={isRu ? 'Редактировать шаблон' : 'Edit Template'} fullHeight>
        {editingPe && <PlannedExpenseForm key={editingPe.id} expense={editingPe} onClose={() => setEditingPe(null)} />}
      </Modal>

      <Modal isOpen={!!editingDebtPayment} onClose={() => setEditingDebtPayment(null)} title={isRu ? 'Редактировать платёж' : 'Edit Payment'} fullHeight>
        {editingDebtPayment && <EditDebtPaymentForm debt={editingDebtPayment.debt} payment={editingDebtPayment.payment} onClose={() => setEditingDebtPayment(null)} />}
      </Modal>

      <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">{isRu ? 'Транзакция будет удалена, а баланс счёта пересчитан.' : 'Transaction will be deleted and account balance recalculated.'}</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingId(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: C.field, border: `1px solid ${C.border}` }}>{t.cancel}</button>
            <button onClick={() => { if (deletingId) { deleteTransaction(deletingId); setDeletingId(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>{t.delete}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingDebtPayment} onClose={() => setDeletingDebtPayment(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">{isRu ? 'Платёж будет удалён, а баланс счёта пересчитан.' : 'Payment will be deleted and account balance recalculated.'}</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingDebtPayment(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: C.field, border: `1px solid ${C.border}` }}>{t.cancel}</button>
            <button onClick={() => { if (deletingDebtPayment) { deleteDebtPayment(deletingDebtPayment.debtId, deletingDebtPayment.paymentId); setDeletingDebtPayment(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>{t.delete}</button>
          </div>
        </div>
      </Modal>

      {(() => {
        const dp = revertingDebtPayment ? debts.find((d) => d.id === revertingDebtPayment.debtId)?.payments.find((p) => p.id === revertingDebtPayment.paymentId) : null;
        const hasScheduled = !!dp?.scheduledPaymentDueDate;
        return (
          <Modal isOpen={!!revertingDebtPayment} onClose={() => setRevertingDebtPayment(null)} title={isRu ? 'Отметить невыполненным?' : 'Mark as not completed?'}>
            <div className="px-5 pb-6">
              <p className="text-slate-400 text-sm mb-5">
                {isRu ? (hasScheduled ? 'Платёж будет отмечен как невыполненный, баланс восстановлен, а запланированный платёж вернётся в календарь.' : 'Платёж будет отмечен как невыполненный, баланс счёта будет восстановлен.') : (hasScheduled ? 'The payment will be marked as not completed, balance restored, and the scheduled payment will return to the calendar.' : 'The payment will be marked as not completed and the account balance will be restored.')}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRevertingDebtPayment(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: C.field, border: `1px solid ${C.border}` }}>{t.cancel}</button>
                <button onClick={() => { if (revertingDebtPayment) { revertDebtPaymentToScheduled(revertingDebtPayment.debtId, revertingDebtPayment.paymentId); setRevertingDebtPayment(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>{isRu ? 'Вернуть' : 'Return'}</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      <Modal isOpen={!!reversingTx} onClose={() => setReversingTx(null)} title={isRu ? 'Создать возврат?' : 'Create Reversal?'}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {isRu ? `Будет создана обратная транзакция: ${reversingTx?.type === 'income' ? 'расход' : 'доход'} ${reversingTx ? formatAmount(reversingTx.amount, reversingTx.currency) : ''}` : `A reverse transaction will be created: ${reversingTx?.type === 'income' ? 'expense' : 'income'} ${reversingTx ? formatAmount(reversingTx.amount, reversingTx.currency) : ''}`}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setReversingTx(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: C.field, border: `1px solid ${C.border}` }}>{t.cancel}</button>
            <button onClick={() => { if (reversingTx) { addTransaction({ accountId: reversingTx.accountId, type: reversingTx.type === 'income' ? 'expense' : 'income', amount: reversingTx.amount, currency: reversingTx.currency, categoryId: reversingTx.categoryId, description: (isRu ? 'Возврат: ' : 'Return: ') + reversingTx.description, date: format(new Date(), 'yyyy-MM-dd') }); setReversingTx(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>{isRu ? 'Создать возврат' : 'Create'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingPe} onClose={() => setDeletingPe(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">{isRu ? 'Плановая операция и все её повторения будут удалены.' : 'The planned operation and all its recurrences will be deleted.'}</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingPe(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: C.field, border: `1px solid ${C.border}` }}>{t.cancel}</button>
            <button onClick={() => { if (deletingPe) { deletePlannedExpense(deletingPe.id); setDeletingPe(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>{t.delete}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Small helper components ──

function ActionButton({ label, color, bg, border, icon, onClick }: { label: string; color: string; bg: string; border: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="active-scale"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 10, background: bg, border: `1px solid ${border}`, color, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}
    >
      {icon}{label}
    </button>
  );
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <p style={{ color: C.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</p>
      {right}
    </div>
  );
}

function MiniStat({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${color}30` }}>{icon}</div>
      <div>
        <p style={{ color: C.muted, fontSize: 10, marginBottom: 1 }}>{label}</p>
        <p style={{ color, fontSize: 13, fontWeight: 700 }}>{value}</p>
      </div>
    </div>
  );
}

function EmptyCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: '18px', borderRadius: 16, background: C.glassCard, border: `1px solid ${C.glassBorder}`, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, boxShadow: C.shadowCard }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <p style={{ color: C.muted, fontSize: 13 }}>{text}</p>
    </div>
  );
}

function TxRow({ icon, iconBg, title, subtitle, amount, amountColor, amountSub, borderBottom, actions }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string;
  amount: string; amountColor: string; amountSub?: string; borderBottom: string; actions: React.ReactNode[];
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(17,24,39,0.5)', borderBottom }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        <p style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{subtitle}</p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 4 }}>
        <p style={{ color: amountColor, fontSize: 14, fontWeight: 700 }}>{amount}</p>
        {amountSub && <p style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{amountSub}</p>}
      </div>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>{actions}</div>
    </div>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="active-scale" style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(30,41,59,0.8)', border: `1px solid ${C.glassBorder}`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
      {children}
    </button>
  );
}

const linkBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 3,
  color: C.blue, fontSize: 11, fontWeight: 700,
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  transition: 'all 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 22, height: 20, borderRadius: 10,
  background: `${C.blue}25`, color: C.blue,
  fontSize: 10, fontWeight: 700, padding: '0 6px',
  border: `1px solid ${C.blue}40`,
};
