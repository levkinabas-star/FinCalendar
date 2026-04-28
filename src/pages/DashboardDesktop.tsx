import { useState, useMemo } from 'react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { TrendingUp, TrendingDown, ArrowLeftRight, Pencil, Trash2, RotateCcw, ChevronRight, RefreshCw, Plus, LayoutDashboard } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';
import { useAddTransaction } from '../contexts/AddTransactionContext';

const C = {
  bg: '#07070F',
  card: '#0E0E1C',
  surface: '#131325',
  elevated: '#181830',
  field: '#1E1E38',
  border: '#1E2A40',
  text: '#F1F5F9',
  muted: '#64748B',
  dim: '#475569',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
};

export default function DashboardDesktop() {
  const { language, accounts, transactions, categories, plannedExpenses, defaultCurrency,
    deleteTransaction, addTransaction, deletePlannedExpense, budgets, debts, deleteDebtPayment,
    revertDebtPaymentToScheduled, togglePlannedCompleted, markPlannedCompletedNoDeduction,
    markScheduledCompletedNoDeduction, unmarkScheduledCompleted, markScheduledAsPaid } = useStore();
  const t = translations[language];
  const navigate = useNavigate();
  const { openAdd } = useAddTransaction();

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
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

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
  const upcomingDebtPayments = useMemo(() => debts
    .filter((d) => d.status === 'active')
    .flatMap((d) => d.scheduledPayments
      .filter((sp) => sp.dueDate >= todayStr && !sp.paidDate && !sp.completedDates?.includes(sp.dueDate))
      .map((sp) => ({ debt: d, payment: sp })))
    .sort((a, b) => a.payment.dueDate.localeCompare(b.payment.dueDate)),
    [debts, todayStr]);

  const upcoming = useMemo(() => {
    const items = [
      ...upcomingPlanned.map((u) => ({ kind: 'planned' as const, expense: u.expense, date: u.date })),
      ...upcomingDebtPayments.map((u) => ({ kind: 'debt' as const, payment: u.payment, debt: u.debt, date: u.payment.dueDate })),
    ];
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [upcomingPlanned, upcomingDebtPayments]);

  const budgetAlerts = useMemo(() => budgets
    .map((b) => {
      const spent = transactions
        .filter((tx) => tx.type === 'expense' && tx.categoryId === b.categoryId && parseISO(tx.date) >= monthStart && parseISO(tx.date) <= monthEnd)
        .reduce((s, tx) => s + tx.amount, 0);
      const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
      return { ...b, spent, pct, cat: categories.find((c) => c.id === b.categoryId) };
    })
    .filter((b) => b.pct >= 80)
    .sort((a, b) => b.pct - a.pct),
    [budgets, transactions, monthStart, monthEnd, categories]);

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

  const TX_LIMIT = 20;
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
    if (isYesterday(d)) return language === 'ru' ? 'Вчера' : 'Yesterday';
    return format(d, language === 'ru' ? 'd MMM yyyy' : 'MMM d, yyyy');
  };

  const greeting = () => {
    const h = now.getHours();
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

  const monthLabel = format(now, language === 'ru' ? 'LLLL yyyy' : 'MMMM yyyy');

  return (
    <div style={{ padding: '28px 32px 40px', minHeight: '100vh', background: C.bg }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#3B82F6,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(59,130,246,0.35)' }}>
            <LayoutDashboard size={22} color="white" />
          </div>
          <div>
            <p style={{ color: C.muted, fontSize: 13 }}>{greeting()} · {monthLabel}</p>
            <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              {language === 'ru' ? 'Главная' : 'Dashboard'}
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => openAdd('income')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: C.green, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            <TrendingUp size={15} /> {language === 'ru' ? 'Доход' : 'Income'}
          </button>
          <button
            onClick={() => openAdd('expense')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#3B82F6,#2563EB)', border: 'none', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}
          >
            <Plus size={15} /> {language === 'ru' ? 'Расход' : 'Expense'}
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Total balance */}
        <div style={{ gridColumn: 'span 1', padding: '18px 20px', borderRadius: 16, background: 'linear-gradient(135deg,#1A2744,#0E1929)', border: '1px solid #1E3A5F', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -16, top: -16, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle,#3B82F6,transparent)', opacity: 0.2 }} />
          <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            {t.totalBalance}
          </p>
          <p style={{ color: totalBalance >= 0 ? C.text : C.red, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
            {formatAmount(totalBalance, defaultCurrency as any)}
          </p>
          <p style={{ color: C.dim, fontSize: 11, marginTop: 5 }}>
            {accounts.length} {language === 'ru' ? (accounts.length === 1 ? 'счёт' : accounts.length < 5 ? 'счёта' : 'счетов') : (accounts.length === 1 ? 'account' : 'accounts')}
          </p>
        </div>
        {/* Income */}
        <div style={{ padding: '18px 20px', borderRadius: 16, background: C.card, border: '1px solid #1A3A2A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color={C.green} />
            </div>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t.income}</p>
          </div>
          <p style={{ color: C.green, fontSize: 22, fontWeight: 700 }}>+{formatAmount(totalMonthIncome, defaultCurrency as any)}</p>
        </div>
        {/* Expenses */}
        <div style={{ padding: '18px 20px', borderRadius: 16, background: C.card, border: '1px solid #3A1A1A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={15} color={C.red} />
            </div>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t.expenses}</p>
          </div>
          <p style={{ color: C.red, fontSize: 22, fontWeight: 700 }}>-{formatAmount(totalMonthExpense, defaultCurrency as any)}</p>
        </div>
        {/* Net */}
        <div style={{ padding: '18px 20px', borderRadius: 16, background: C.card, border: `1px solid ${netMonth >= 0 ? '#1A3A2A' : '#3A1A1A'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: netMonth >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {netMonth >= 0 ? <TrendingUp size={15} color={C.green} /> : <TrendingDown size={15} color={C.red} />}
            </div>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {language === 'ru' ? 'Итого' : 'Net'}
            </p>
          </div>
          <p style={{ color: netMonth >= 0 ? C.green : C.red, fontSize: 22, fontWeight: 700 }}>
            {netMonth >= 0 ? '+' : '-'}{formatAmount(Math.abs(netMonth), defaultCurrency as any)}
          </p>
        </div>
      </div>

      {/* ── Two-column main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Accounts grid */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.accounts}</h2>
              <button onClick={() => navigate('/accounts')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.blue, fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                {t.seeAll} <ChevronRight size={13} />
              </button>
            </div>
            {accounts.length === 0 ? (
              <button onClick={() => navigate('/accounts')} style={{ width: '100%', padding: '18px 20px', borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.field, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>+</div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{language === 'ru' ? 'Добавить счёт' : 'Add account'}</p>
                  <p style={{ color: C.muted, fontSize: 12 }}>{language === 'ru' ? 'Начните с создания счёта' : 'Start by creating an account'}</p>
                </div>
              </button>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => navigate('/accounts')}
                    className="active-scale"
                    style={{ padding: '16px', borderRadius: 14, background: `linear-gradient(135deg,${acc.color}18 0%,${acc.color}08 100%)`, border: `1px solid ${acc.color}28`, textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{acc.icon}</div>
                    <p style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>{acc.name}</p>
                    <p style={{ color: acc.balance >= 0 ? C.text : C.red, fontSize: 16, fontWeight: 700 }}>
                      {formatAmount(acc.balance, acc.currency)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Recent Transactions */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.recentTransactions}</h2>
              {unifiedSorted.length > TX_LIMIT && (
                <button onClick={() => setShowAllTx((v) => !v)} style={{ color: C.blue, fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showAllTx ? (language === 'ru' ? 'Свернуть' : 'Collapse') : `${language === 'ru' ? 'Все' : 'All'} (${unifiedSorted.length})`}
                </button>
              )}
            </div>

            {unifiedSorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
                <p style={{ fontSize: 14 }}>{t.noTransactions}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {grouped.map(([dateStr, items]) => (
                  <div key={dateStr}>
                    <p style={{ color: C.dim, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, paddingLeft: 4 }}>
                      {formatDateLabel(dateStr)}
                    </p>
                    <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      {items.map((item, idx) => {
                        const borderBottom = idx < items.length - 1 ? `1px solid ${C.border}` : 'none';

                        if (item.kind === 'dp') {
                          const { payment, debt } = item;
                          const isLent = debt.direction === 'lent';
                          const acc = getAcc(payment.accountId);
                          const dpColor = isLent ? C.green : C.red;
                          return (
                            <div key={`dp-${payment.id}`} className="group" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.card, borderBottom }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: isLent ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                                {isLent ? '💸' : '🤝'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: C.text, fontSize: 14, fontWeight: 500 }}>{debt.personName}</p>
                                <p style={{ color: C.muted, fontSize: 12 }}>
                                  {language === 'ru' ? 'Долг' : 'Debt'}{payment.note ? ` · ${payment.note}` : ''}{acc ? ` · ${acc.name}` : ''}
                                </p>
                              </div>
                              <span style={{ color: dpColor, fontSize: 15, fontWeight: 700, flexShrink: 0, marginRight: 8 }}>
                                {isLent ? '+' : '-'}{formatAmount(payment.amount, debt.currency)}
                              </span>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <ActionBtn onClick={() => setRevertingDebtPayment({ debtId: debt.id, paymentId: payment.id })} icon={<RotateCcw size={13} color={C.amber} />} />
                                <ActionBtn onClick={() => setEditingDebtPayment({ payment, debt })} icon={<Pencil size={13} color={C.muted} />} />
                                <ActionBtn onClick={() => setDeletingDebtPayment({ debtId: debt.id, paymentId: payment.id })} icon={<Trash2 size={13} color={C.red} />} />
                              </div>
                            </div>
                          );
                        }

                        if (item.kind === 'pe') {
                          const { expense: pe } = item;
                          const isIncome = pe.type === 'income';
                          const cat = getCat(pe.categoryId);
                          const acc = getAcc(pe.accountId);
                          return (
                            <div key={`pe-${pe.id}-${item.date}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.card, borderBottom }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${cat?.color ?? '#94A3B8'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                                {cat?.icon ?? '🔁'}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: C.text, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {pe.description || (language === 'ru' ? cat?.name : cat?.nameEn) || '—'}
                                </p>
                                <p style={{ color: C.muted, fontSize: 12 }}>{acc?.name}{pe.recurring ? ` · 🔁` : ''}</p>
                              </div>
                              <span style={{ color: isIncome ? C.green : C.red, fontSize: 15, fontWeight: 700, flexShrink: 0, marginRight: 8 }}>
                                {isIncome ? '+' : '-'}{formatAmount(pe.amount, pe.currency)}
                              </span>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <ActionBtn onClick={() => togglePlannedCompleted(pe.id, item.date)} icon={<RotateCcw size={13} color={C.amber} />} />
                                <ActionBtn onClick={() => setEditingPe(pe)} icon={<Pencil size={13} color={C.muted} />} />
                                <ActionBtn onClick={() => setDeletingPe({ id: pe.id, date: item.date })} icon={<Trash2 size={13} color={C.red} />} />
                              </div>
                            </div>
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
                          <div key={`tx-${tx.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.card, borderBottom }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: isTransfer ? 'rgba(59,130,246,0.15)' : `${cat?.color ?? '#94A3B8'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isTransfer ? <ArrowLeftRight size={16} color={C.blue} /> : <span style={{ fontSize: 18 }}>{cat?.icon ?? '📌'}</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: C.text, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isTransfer ? `${acc?.name ?? '?'} → ${peerAcc?.name ?? '?'}` : (tx.description || (language === 'ru' ? cat?.name : cat?.nameEn) || '—')}
                              </p>
                              <p style={{ color: C.muted, fontSize: 12 }}>
                                {isTransfer ? (tx.description || (language === 'ru' ? 'Перевод' : 'Transfer')) : acc?.name}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
                              <p style={{ color: txColor, fontSize: 15, fontWeight: 700 }}>
                                {isTransfer ? '-' : tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, tx.currency)}
                              </p>
                              {isTransfer && peerTx && peerTx.currency !== tx.currency && (
                                <p style={{ color: C.muted, fontSize: 11 }}>+{formatAmount(peerTx.amount, peerTx.currency)}</p>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              {!isTransfer && <ActionBtn onClick={() => setReversingTx(tx)} icon={<RotateCcw size={13} color={C.amber} />} />}
                              <ActionBtn onClick={() => isTransfer ? setEditingTransfer(tx) : setEditingTx(tx)} icon={<Pencil size={13} color={C.muted} />} />
                              <ActionBtn onClick={() => setDeletingId(tx.id)} icon={<Trash2 size={13} color={C.red} />} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 28 }}>

          {/* Upcoming payments */}
          <section style={{ borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>📅</span>
                <h2 style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
                  {language === 'ru' ? 'Ближайшие платежи' : 'Upcoming Payments'}
                </h2>
              </div>
              {upcoming.length > 3 && (
                <button onClick={() => setShowAllUpcoming((v) => !v)} style={{ color: C.blue, fontSize: 11, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showAllUpcoming ? (language === 'ru' ? 'Свернуть' : 'Less') : `+${upcoming.length - 3}`}
                </button>
              )}
            </div>
            {upcoming.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
                {language === 'ru' ? 'Нет предстоящих платежей' : 'No upcoming payments'}
              </div>
            ) : (
              <div>
                {(showAllUpcoming ? upcoming : upcoming.slice(0, 3)).map((item, idx, arr) => (
                  <UpcomingRow
                    key={item.kind === 'planned' ? `d-p-${item.expense.id}-${item.date}` : `d-d-${item.payment.id}`}
                    item={item as any}
                    idx={idx}
                    total={arr.length}
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
            <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => navigate('/calendar')}
                style={{ width: '100%', padding: '8px', borderRadius: 8, background: C.surface, border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {language === 'ru' ? 'Открыть календарь' : 'Open Calendar'} →
              </button>
            </div>
          </section>

          {/* Budget alerts */}
          {budgetAlerts.length > 0 && (
            <section style={{ borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📊</span>
                  <h2 style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
                    {language === 'ru' ? 'Бюджет — алерты' : 'Budget Alerts'}
                  </h2>
                </div>
                <button onClick={() => navigate('/budgets')} style={{ color: C.blue, fontSize: 11, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {t.seeAll}
                </button>
              </div>
              <div style={{ padding: '8px 0' }}>
                {budgetAlerts.slice(0, 4).map((b) => {
                  const color = b.pct >= 100 ? C.red : b.pct >= 90 ? C.amber : C.blue;
                  return (
                    <div
                      key={b.id}
                      onClick={() => navigate('/budgets')}
                      className="active-scale"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${b.cat?.color ?? '#94A3B8'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                        {b.cat?.icon ?? '📊'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <p style={{ color: C.text, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {language === 'ru' ? b.cat?.name : b.cat?.nameEn}
                          </p>
                          <span style={{ color, fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{b.pct}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(b.pct, 100)}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quick nav to statistics */}
          <button
            onClick={() => navigate('/statistics')}
            className="active-scale"
            style={{ width: '100%', padding: '14px 16px', borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16 }}>📈</span>
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{t.statistics}</p>
                <p style={{ color: C.muted, fontSize: 11 }}>{language === 'ru' ? 'Аналитика и тренды' : 'Analytics & trends'}</p>
              </div>
            </div>
            <ChevronRight size={15} color={C.dim} />
          </button>
        </div>
      </div>

      {/* ── Modals (same functional set as mobile) ── */}

      <Modal isOpen={!!editingTx} onClose={() => setEditingTx(null)}
        title={language === 'ru' ? 'Редактировать операцию' : 'Edit Transaction'} fullHeight>
        {editingTx && <TransactionForm key={editingTx.id} editingTx={editingTx} onClose={() => setEditingTx(null)} />}
      </Modal>

      <Modal isOpen={!!editingTransfer} onClose={() => setEditingTransfer(null)}
        title={language === 'ru' ? 'Редактировать перевод' : 'Edit Transfer'} fullHeight>
        {editingTransfer && <TransferForm key={editingTransfer.id} editingTx={editingTransfer} onClose={() => setEditingTransfer(null)} />}
      </Modal>

      <Modal isOpen={!!editingPe} onClose={() => setEditingPe(null)}
        title={language === 'ru' ? 'Редактировать шаблон' : 'Edit Template'} fullHeight>
        {editingPe && <PlannedExpenseForm key={editingPe.id} expense={editingPe} onClose={() => setEditingPe(null)} />}
      </Modal>

      <Modal isOpen={!!editingDebtPayment} onClose={() => setEditingDebtPayment(null)}
        title={language === 'ru' ? 'Редактировать платёж' : 'Edit Payment'} fullHeight>
        {editingDebtPayment && <EditDebtPaymentForm debt={editingDebtPayment.debt} payment={editingDebtPayment.payment} onClose={() => setEditingDebtPayment(null)} />}
      </Modal>

      <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru' ? 'Транзакция будет удалена, а баланс счёта пересчитан.' : 'Transaction will be deleted and account balance recalculated.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingId(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>{t.cancel}</button>
            <button onClick={() => { if (deletingId) { deleteTransaction(deletingId); setDeletingId(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>{t.delete}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingDebtPayment} onClose={() => setDeletingDebtPayment(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru' ? 'Платёж будет удалён, а баланс счёта пересчитан.' : 'Payment will be deleted and account balance recalculated.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingDebtPayment(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>{t.cancel}</button>
            <button onClick={() => { if (deletingDebtPayment) { deleteDebtPayment(deletingDebtPayment.debtId, deletingDebtPayment.paymentId); setDeletingDebtPayment(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>{t.delete}</button>
          </div>
        </div>
      </Modal>

      {(() => {
        const dp = revertingDebtPayment ? debts.find((d) => d.id === revertingDebtPayment.debtId)?.payments.find((p) => p.id === revertingDebtPayment.paymentId) : null;
        const hasScheduled = !!dp?.scheduledPaymentDueDate;
        return (
          <Modal isOpen={!!revertingDebtPayment} onClose={() => setRevertingDebtPayment(null)} title={language === 'ru' ? 'Отметить невыполненным?' : 'Mark as not completed?'}>
            <div className="px-5 pb-6">
              <p className="text-slate-400 text-sm mb-5">
                {language === 'ru' ? (hasScheduled ? 'Платёж будет отмечен как невыполненный, баланс восстановлен, а запланированный платёж вернётся в календарь.' : 'Платёж будет отмечен как невыполненный, баланс счёта будет восстановлен.') : (hasScheduled ? 'The payment will be marked as not completed, balance restored, and the scheduled payment will return to the calendar.' : 'The payment will be marked as not completed and the account balance will be restored.')}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRevertingDebtPayment(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>{t.cancel}</button>
                <button onClick={() => { if (revertingDebtPayment) { revertDebtPaymentToScheduled(revertingDebtPayment.debtId, revertingDebtPayment.paymentId); setRevertingDebtPayment(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>{language === 'ru' ? 'Вернуть' : 'Return'}</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      <Modal isOpen={!!reversingTx} onClose={() => setReversingTx(null)} title={language === 'ru' ? 'Создать возврат?' : 'Create Reversal?'}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru' ? `Будет создана обратная транзакция: ${reversingTx?.type === 'income' ? 'расход' : 'доход'} ${reversingTx ? formatAmount(reversingTx.amount, reversingTx.currency) : ''}` : `A reverse transaction will be created: ${reversingTx?.type === 'income' ? 'expense' : 'income'} ${reversingTx ? formatAmount(reversingTx.amount, reversingTx.currency) : ''}`}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setReversingTx(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>{t.cancel}</button>
            <button onClick={() => { if (reversingTx) { addTransaction({ accountId: reversingTx.accountId, type: reversingTx.type === 'income' ? 'expense' : 'income', amount: reversingTx.amount, currency: reversingTx.currency, categoryId: reversingTx.categoryId, description: (language === 'ru' ? 'Возврат: ' : 'Return: ') + reversingTx.description, date: format(new Date(), 'yyyy-MM-dd') }); setReversingTx(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>{language === 'ru' ? 'Создать возврат' : 'Create'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingPe} onClose={() => setDeletingPe(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru' ? 'Плановая операция и все её повторения будут удалены.' : 'The planned operation and all its recurrences will be deleted.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingPe(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>{t.cancel}</button>
            <button onClick={() => { if (deletingPe) { deletePlannedExpense(deletingPe.id); setDeletingPe(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>{t.delete}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ActionBtn({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="active-scale"
      style={{ width: 30, height: 30, borderRadius: 8, background: '#1E1E38', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
    >
      {icon}
    </button>
  );
}
