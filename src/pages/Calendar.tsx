import { useState, useMemo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Check, Pencil, Trash2, RepeatIcon, ArrowLeftRight, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { formatAmount, getDatesWithEventsInMonth, getExpensesForDate, getDebtPaymentsInMonth, getDebtPaymentsForDate, getScheduledPaymentsInMonth, getScheduledPaymentsForDate, getDebtsWithDueDateInMonth, DebtScheduledPayment } from '../utils';
import { PlannedExpense, Transaction, Debt, DebtPayment } from '../types';
import Modal from '../components/Modal';
import DebtForm from '../components/DebtForm';
import PlannedExpenseForm from '../components/PlannedExpenseForm';
import TransactionForm from '../components/TransactionForm';
import TransferForm from '../components/TransferForm';
import EditDebtPaymentForm from '../components/EditDebtPaymentForm';
import DebtPaymentForm from '../components/DebtPaymentForm';
import { usePlan, FREE_LIMITS } from '../plan';
import { useNavigate } from 'react-router-dom';

export default function Calendar() {
  const { language, accounts, categories, plannedExpenses, transactions, togglePlannedCompleted, markPlannedCompletedNoDeduction, deletePlannedExpense, debts, deleteDebtPayment, revertDebtPaymentToScheduled, markScheduledAsPaid, deleteScheduledPayment, deleteTransaction, markScheduledCompletedNoDeduction, unmarkScheduledCompleted } = useStore();
  const t = translations[language];
  const { canAddPlannedExpense } = usePlan();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PlannedExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<{ expense: PlannedExpense; date: string } | null>(null);
  const [deletingDebtPayment, setDeletingDebtPayment] = useState<{ debtId: string; paymentId: string; personName: string } | null>(null);
  const [deletingScheduledPayment, setDeletingScheduledPayment] = useState<{ debtId: string; scheduledId: string; personName: string } | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [editingDebtPayment, setEditingDebtPayment] = useState<{ payment: DebtPayment; debt: Debt } | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [openEditMenu, setOpenEditMenu] = useState<{ key: string; pos: { top: number; right: number } } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const eventMap = getDatesWithEventsInMonth(plannedExpenses, year, month);
  const selectedEvents = getExpensesForDate(plannedExpenses, selectedDate);
  const debtPaymentsMap = getDebtPaymentsInMonth(debts, year, month);
  const selectedDebtPayments = getDebtPaymentsForDate(debts, selectedDate);
  const scheduledPaymentsMap = getScheduledPaymentsInMonth(debts, year, month);
  const selectedScheduledPayments = getScheduledPaymentsForDate(debts, selectedDate);
  const debtsWithDueDateMap = getDebtsWithDueDateInMonth(debts, year, month);

  // Transactions for selected date (deduplicate transfer pairs)
  const selectedTx = useMemo(() => {
    return transactions
      .filter((tx) => tx.date === selectedDate)
      .filter((tx) => {
        if (tx.type === 'transfer' && tx.transferPeerId) {
          if (tx.transferRole === 'in') return false;
          if (tx.transferRole === 'out') return true;
          // Legacy: peer createdAt or description
          const peer = transactions.find((t) => t.id === tx.transferPeerId);
          if (!peer) return true;
          if (peer.createdAt !== tx.createdAt) return tx.createdAt > peer.createdAt;
          if (tx.description.startsWith('←')) return false;
          if (peer.description.startsWith('←')) return true;
          return tx.id > peer.id;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [transactions, selectedDate]);

  // Unified operations: planned expenses + debt payments + completed scheduled payments
  type DayOp =
    | { kind: 'planned'; expense: PlannedExpense }
    | { kind: 'debtPayment'; payment: DebtPayment; debt: Debt }
    | { kind: 'scheduled'; sp: DebtScheduledPayment; debt: Debt };

  const dayOps = useMemo<DayOp[]>(() => {
    const planned: DayOp[] = selectedEvents.map((e) => ({ kind: 'planned', expense: e }));
    const debtPayments: DayOp[] = selectedDebtPayments.map((p) => ({ kind: 'debtPayment', payment: p, debt: p.debt }));
    const scheduled: DayOp[] = selectedScheduledPayments.map((sp) => ({ kind: 'scheduled', sp, debt: sp.debt }));
    return [...planned, ...debtPayments, ...scheduled];
  }, [selectedEvents, selectedDebtPayments, selectedScheduledPayments]);

  const hasDayOps = dayOps.length > 0;

  // Days that have transactions (for dots in grid)
  const txDates = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => set.add(tx.date));
    return set;
  }, [transactions]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= monthEnd || days.length % 7 !== 0) {
    days.push(d);
    d = addDays(d, 1);
    if (days.length > 42) break;
  }

  const getCat = (id: string) => categories.find((c) => c.id === id);
  const getAcc = (id: string) => accounts.find((a) => a.id === id);

  const freqLabel = (exp: PlannedExpense) => {
    if (!exp.recurring) return null;
    const map = { weekly: t.weekly, monthly: t.monthly, yearly: t.yearly };
    return map[exp.recurring.frequency];
  };

  const txColor = (tx: Transaction) =>
    tx.type === 'transfer' ? '#3B82F6' : tx.type === 'income' ? '#10B981' : '#EF4444';

  const txSign = (tx: Transaction) =>
    tx.type === 'transfer' ? '↔' : tx.type === 'income' ? '+' : '-';

  const hasAnything = hasDayOps || selectedTx.length > 0 || (debtsWithDueDateMap[selectedDate]?.length ?? 0) > 0;

  return (
    <div className="page-enter pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-100">{t.calendar}</h1>
        <button
          onClick={() => canAddPlannedExpense ? setShowAdd(true) : navigate('/pricing')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-medium text-white text-sm active-scale"
          style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
        >
          <Plus size={16} />
          {t.addPlanned}
        </button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between px-5 mb-4">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}>
          <ChevronLeft size={18} className="text-slate-300" />
        </button>
        <h2 className="text-lg font-semibold text-slate-100">
          {t.months[month]} {year}
        </h2>
        <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}>
          <ChevronRight size={18} className="text-slate-300" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="mx-5 rounded-2xl overflow-hidden mb-5" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: '#1E2A40' }}>
          {t.weekdays.map((wd, i) => (
            <div key={i} className="py-2 text-center text-xs font-medium"
              style={{ color: i >= 5 ? '#3B82F6' : '#64748B' }}>
              {wd}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const selected = dateStr === selectedDate;
            const events = eventMap[dateStr];
            const hasTx = txDates.has(dateStr) && inMonth;
            const debtPaymentInfo = debtPaymentsMap[dateStr];
            const dayOfWeek = day.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(dateStr)}
                className="relative flex flex-col items-center py-2 active-scale"
                style={{
                  borderRight: (idx + 1) % 7 !== 0 ? '1px solid #1E2A40' : 'none',
                  borderBottom: idx < days.length - 7 ? '1px solid #1E2A40' : 'none',
                  background: selected ? 'rgba(59,130,246,0.15)' : 'transparent',
                }}
              >
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium"
                  style={{
                    background: today ? '#3B82F6' : 'transparent',
                    color: today ? 'white' : !inMonth ? '#334155' : isWeekend ? '#60A5FA' : '#F1F5F9',
                    fontWeight: today || selected ? 700 : 400,
                  }}
                >
                  {day.getDate()}
                </span>

                {/* Dots row */}
                {inMonth && (events || hasTx || debtPaymentInfo || scheduledPaymentsMap[dateStr] || debtsWithDueDateMap[dateStr]) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {events?.pending > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F59E0B' }} />
                    )}
                    {events?.completed > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                    )}
                    {hasTx && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B82F6' }} />
                    )}
                    {debtPaymentInfo && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#8B5CF6' }} />
                    )}
                    {scheduledPaymentsMap[dateStr] && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#A855F7' }} />
                    )}
                    {debtsWithDueDateMap[dateStr] && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F97316' }} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
          <span className="text-xs text-slate-500">{t.pending}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
          <span className="text-xs text-slate-500">{t.completed}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
          <span className="text-xs text-slate-500">{language === 'ru' ? 'Операции' : 'Transactions'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6' }} />
          <span className="text-xs text-slate-500">{language === 'ru' ? 'Платежи' : 'Payments'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#A855F7' }} />
          <span className="text-xs text-slate-500">{language === 'ru' ? 'Запланировано' : 'Scheduled'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#F97316' }} />
          <span className="text-xs text-slate-500">{language === 'ru' ? 'Срок долга' : 'Due date'}</span>
        </div>
      </div>

      {/* Selected Day Panel */}
      <div className="mx-5 space-y-4">
        {/* Date title */}
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          {selectedDate === format(new Date(), 'yyyy-MM-dd') ? t.today : selectedDate}
        </h3>

        {/* Empty state */}
        {!hasAnything && (
          <div className="rounded-2xl flex flex-col items-center py-8 text-slate-500"
            style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
            <span className="text-3xl mb-2">📅</span>
            <p className="text-sm">{t.noEventsToday}</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 text-blue-400 text-sm font-medium active-scale"
            >
              + {t.addPlanned}
            </button>
          </div>
        )}

        {/* Operations: planned + debt payments + scheduled */}
        {dayOps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
              {language === 'ru' ? 'Операции' : 'Operations'}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2A40' }}>
              {dayOps.map((op, idx) => {
                const isPending = op.kind === 'scheduled' && !op.sp.paidDate && !op.sp.completedDates?.includes(selectedDate);
                const isDone = op.kind === 'planned'
                  ? op.expense.completedDates.includes(selectedDate)
                  : (op.kind === 'debtPayment' || (op.kind === 'scheduled' && !!op.sp.paidDate));
                const rowBg = isDone ? 'rgba(16,185,129,0.05)' : '#0E0E1C';

                let icon: ReactNode;
                let title: string;
                let subtitle: string;
                let amountColor: string = '#EF4444';
                let amountStr: string = '';

                if (op.kind === 'planned') {
                  const cat = getCat(op.expense.categoryId);
                  const acc = getAcc(op.expense.accountId);
                  const isIncome = op.expense.type === 'income';
                  icon = <span className="text-lg">{cat?.icon ?? '📌'}</span>;
                  title = op.expense.description || (language === 'ru' ? cat?.name : cat?.nameEn) || '—';
                  subtitle = `${acc?.icon ?? ''} ${acc?.name ?? ''}`;
                  amountColor = isIncome ? '#10B981' : isDone ? '#10B981' : '#EF4444';
                  amountStr = `${isIncome ? '+' : '-'}${formatAmount(op.expense.amount, op.expense.currency)}`;
                } else if (op.kind === 'debtPayment') {
                  const acc = accounts.find((a) => a.id === op.payment.accountId);
                  const isLent = op.debt.direction === 'lent';
                  icon = <span className="text-lg">{isLent ? '💸' : '🤝'}</span>;
                  title = op.debt.personName;
                  subtitle = `${acc?.icon ?? ''} ${acc?.name ?? ''}${op.payment.note ? ` · ${op.payment.note}` : ''}`;
                  amountColor = '#10B981';
                  amountStr = `${isLent ? '+' : '-'}${formatAmount(op.payment.amount, op.debt.currency)}`;
                } else {
                  const isLent = op.debt.direction === 'lent';
                  const acc = op.sp.sourceAccountId ? accounts.find((a) => a.id === op.sp.sourceAccountId) : null;
                  icon = isDone ? <span className="text-lg">✅</span> : <span className="text-lg">📅</span>;
                  title = op.debt.personName;
                  subtitle = `${acc ? `${acc.icon} ${acc.name}` : ''} ${op.sp.note || (language === 'ru' ? 'Запланированный платёж' : 'Scheduled')}`;
                  amountColor = isDone ? '#10B981' : isLent ? '#10B981' : '#EF4444';
                  amountStr = `${isLent ? '+' : '-'}${formatAmount(op.sp.amount, op.debt.currency)}`;
                }

                return (
                  <div
                    key={`${op.kind}-${op.kind === 'planned' ? op.expense.id : op.kind === 'debtPayment' ? op.payment.id : op.sp.id}`}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      background: rowBg,
                      borderBottom: idx < dayOps.length - 1 ? '1px solid #1E2A40' : 'none',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isDone ? 'rgba(16,185,129,0.15)' : 'rgba(168,85,247,0.15)' }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-200 truncate">{title}</p>
                        {isDone && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
                            {language === 'ru' ? 'выполнено' : 'done'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm font-semibold" style={{ color: amountColor }}>
                        {amountStr}
                      </span>

                      {/* Planned expense actions */}
                      {op.kind === 'planned' && !isDone && (
                        <button
                          onClick={() => togglePlannedCompleted(op.expense.id, selectedDate)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold active-scale"
                          style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' }}
                        >
                          {language === 'ru' ? 'Выполнить' : 'Done'}
                        </button>
                      )}
                      {op.kind === 'planned' && isDone && (
                        <button
                          onClick={() => togglePlannedCompleted(op.expense.id, selectedDate)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold active-scale flex items-center gap-1"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}
                        >
                          <RotateCcw size={11} />
                          {language === 'ru' ? 'Вернуть' : 'Return'}
                        </button>
                      )}

                      {/* Scheduled debt payment actions */}
                      {op.kind === 'scheduled' && isPending && (
                        <button
                          onClick={() => { const accId = op.sp.sourceAccountId || accounts[0]?.id; if (accId) markScheduledAsPaid(op.debt.id, op.sp.id, accId); }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold active-scale"
                          style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' }}
                        >
                          {language === 'ru' ? 'Выполнить' : 'Done'}
                        </button>
                      )}
                      {op.kind === 'scheduled' && isDone && (
                        <button
                          onClick={() => {
                            const debtPayment = op.sp.debt.payments.find((p: DebtPayment) => p.scheduledPaymentId === op.sp.id);
                            if (debtPayment) revertDebtPaymentToScheduled(op.debt.id, debtPayment.id);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold active-scale flex items-center gap-1"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}
                        >
                          <RotateCcw size={11} />
                          {language === 'ru' ? 'Вернуть' : 'Return'}
                        </button>
                      )}

                      {/* Debt payment (manual) actions */}
                      {op.kind === 'debtPayment' && isDone && op.payment.scheduledPaymentId && (
                        <button
                          onClick={() => revertDebtPaymentToScheduled(op.debt.id, op.payment.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold active-scale flex items-center gap-1"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}
                        >
                          <RotateCcw size={11} />
                          {language === 'ru' ? 'Вернуть' : 'Return'}
                        </button>
                      )}

                      {/* Edit / Delete buttons */}
                      {op.kind === 'planned' && (
                        <>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const key = `planned-${op.expense.id}`;
                                setOpenEditMenu(openEditMenu?.key === key ? null : { key, pos: { top: rect.bottom + 4, right: window.innerWidth - rect.right } });
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center active-scale"
                              style={{ background: '#1E1E38' }}
                            >
                              <Pencil size={12} className="text-slate-400" />
                            </button>
                            {openEditMenu?.key === `planned-${op.expense.id}` && createPortal(
                              <>
                                <div className="fixed inset-0" style={{ zIndex: 300 }} onClick={() => setOpenEditMenu(null)} />
                                <div className="fixed rounded-xl overflow-hidden shadow-lg" style={{ top: openEditMenu.pos.top, right: openEditMenu.pos.right, zIndex: 301, background: '#1E1E38', border: '1px solid #1E2A40', minWidth: 170 }}>
                                  <button
                                    onClick={() => { setEditingExpense(op.expense); setOpenEditMenu(null); }}
                                    className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 active-scale"
                                    style={{ color: '#F1F5F9' }}
                                  >
                                    <Pencil size={14} color="#94A3B8" />
                                    <span>{language === 'ru' ? 'Редактировать' : 'Edit'}</span>
                                  </button>
                                  {!isDone && (
                                    <>
                                      <div style={{ height: 1, background: '#1E2A40' }} />
                                      <button
                                        onClick={() => { markPlannedCompletedNoDeduction(op.expense.id, selectedDate); setOpenEditMenu(null); }}
                                        className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 active-scale"
                                        style={{ color: '#F1F5F9' }}
                                      >
                                        <Check size={14} color="#A855F7" />
                                        <span>{language === 'ru' ? 'Без списания' : 'No deduction'}</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>,
                              document.body
                            )}
                          </div>
                          <button onClick={() => setDeletingExpense({ expense: op.expense, date: selectedDate })} className="w-7 h-7 rounded-lg flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}>
                            <Trash2 size={12} color="#EF4444" />
                          </button>
                        </>
                      )}
                      {op.kind === 'debtPayment' && (
                        <>
                          <button onClick={() => setEditingDebtPayment({ payment: op.payment, debt: op.debt })} className="w-7 h-7 rounded-lg flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}>
                            <Pencil size={12} className="text-slate-400" />
                          </button>
                          <button onClick={() => setDeletingDebtPayment({ debtId: op.debt.id, paymentId: op.payment.id, personName: op.debt.personName })} className="w-7 h-7 rounded-lg flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}>
                            <Trash2 size={12} color="#EF4444" />
                          </button>
                        </>
                      )}
                      {op.kind === 'scheduled' && isPending && (
                        <>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const key = `scheduled-${op.sp.id}`;
                                setOpenEditMenu(openEditMenu?.key === key ? null : { key, pos: { top: rect.bottom + 4, right: window.innerWidth - rect.right } });
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center active-scale"
                              style={{ background: '#1E1E38' }}
                            >
                              <Pencil size={12} className="text-slate-400" />
                            </button>
                            {openEditMenu?.key === `scheduled-${op.sp.id}` && createPortal(
                              <>
                                <div className="fixed inset-0" style={{ zIndex: 300 }} onClick={() => setOpenEditMenu(null)} />
                                <div className="fixed rounded-xl overflow-hidden shadow-lg" style={{ top: openEditMenu.pos.top, right: openEditMenu.pos.right, zIndex: 301, background: '#1E1E38', border: '1px solid #1E2A40', minWidth: 170 }}>
                                  <button
                                    onClick={() => { markScheduledCompletedNoDeduction(op.debt.id, op.sp.id, selectedDate); setOpenEditMenu(null); }}
                                    className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 active-scale"
                                    style={{ color: '#F1F5F9' }}
                                  >
                                    <Check size={14} color="#A855F7" />
                                    <span>{language === 'ru' ? 'Без списания' : 'No deduction'}</span>
                                  </button>
                                </div>
                              </>,
                              document.body
                            )}
                          </div>
                          <button onClick={() => setDeletingScheduledPayment({ debtId: op.debt.id, scheduledId: op.sp.id, personName: op.debt.personName })} className="w-7 h-7 rounded-lg flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}>
                            <Trash2 size={12} color="#EF4444" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actual Transactions for the day */}
        {selectedTx.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
              {language === 'ru' ? 'Операции' : 'Transactions'}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2A40' }}>
              {selectedTx.map((tx, idx) => {
                const isTransfer = tx.type === 'transfer';
                const cat = getCat(tx.categoryId);
                const acc = getAcc(tx.accountId);
                const peerAcc = isTransfer && tx.transferPeerAccountId ? getAcc(tx.transferPeerAccountId) : null;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      background: '#0E0E1C',
                      borderBottom: idx < selectedTx.length - 1 ? '1px solid #1E2A40' : 'none',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isTransfer ? 'rgba(59,130,246,0.15)' : `${cat?.color ?? '#94A3B8'}22` }}
                    >
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
                          ? (tx.description.startsWith('→') || tx.description.startsWith('←') ? '' : tx.description) || (language === 'ru' ? 'Перевод' : 'Transfer')
                          : `${acc?.icon ?? ''} ${acc?.name ?? ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isTransfer ? (
                        <p className="text-sm font-semibold" style={{ color: txColor(tx) }}>
                          -{formatAmount(tx.amount, tx.currency)}
                        </p>
                      ) : (
                        <span className="text-sm font-semibold" style={{ color: txColor(tx) }}>
                          {txSign(tx)}{formatAmount(tx.amount, tx.currency)}
                        </span>
                      )}
                      <button
                        onClick={() => isTransfer ? setEditingTransfer(tx) : setEditingTx(tx)}
                        className="w-11 h-11 rounded-lg flex items-center justify-center active-scale opacity-80"
                        style={{ background: '#1E1E38' }}
                      >
                        <Pencil size={14} color="#94A3B8" />
                      </button>
                      <button
                        onClick={() => setDeletingTxId(tx.id)}
                        className="w-11 h-11 rounded-lg flex items-center justify-center active-scale opacity-80"
                        style={{ background: '#1E1E38' }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day totals */}
            {(() => {
              const inc = selectedTx.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
              const exp = selectedTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
              if (inc === 0 && exp === 0) return null;
              return (
                <div className="flex gap-3 mt-2">
                  {inc > 0 && (
                    <div className="flex-1 rounded-xl px-3 py-2 text-center"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <p className="text-[10px] text-slate-500 mb-0.5">{t.income}</p>
                      <p className="text-sm font-bold text-emerald-400">+{inc.toLocaleString()}</p>
                    </div>
                  )}
                  {exp > 0 && (
                    <div className="flex-1 rounded-xl px-3 py-2 text-center"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-[10px] text-slate-500 mb-0.5">{t.expenses}</p>
                      <p className="text-sm font-bold text-red-400">-{exp.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Debts with due date for the day */}
        {debtsWithDueDateMap[selectedDate] && debtsWithDueDateMap[selectedDate].length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1 flex items-center gap-1">
              <span style={{ color: '#F97316' }}>●</span>
              {language === 'ru' ? 'Сроки долгов' : 'Debt Due Dates'}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #F9731630' }}>
              {debtsWithDueDateMap[selectedDate].map((debt, idx) => {
                const remaining = debt.amount - debt.paidAmount;
                const isLent = debt.direction === 'lent';
                return (
                  <div
                    key={debt.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      background: '#0E0E1C',
                      borderBottom: idx < debtsWithDueDateMap[selectedDate].length - 1 ? '1px solid #1E2A40' : 'none',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isLent ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.15)' }}
                    >
                      <span className="text-lg">{isLent ? '💸' : '🤝'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {debt.personName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {debt.description || (language === 'ru' ? 'Срок долга' : 'Debt due date')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isLent ? '#10B981' : '#EF4444' }}
                      >
                        {formatAmount(remaining, debt.currency)}
                      </span>
                      <button
                        onClick={() => setPayingDebt(debt)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold active-scale"
                        style={{ background: '#3B82F620', color: '#60A5FA', border: '1px solid #3B82F630' }}
                      >
                        {language === 'ru' ? 'Выполнить' : 'Done'}
                      </button>
                      <button
                        onClick={() => setEditingDebt(debt)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active-scale"
                        style={{ background: '#1E1E38' }}
                      >
                        <Pencil size={12} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={t.addPlanned} fullHeight>
        <PlannedExpenseForm defaultDate={selectedDate} onClose={() => setShowAdd(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title={t.editPlanned} fullHeight>
        {editingExpense && (
          <PlannedExpenseForm expense={editingExpense} onClose={() => setEditingExpense(null)} />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deletingExpense} onClose={() => setDeletingExpense(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? 'Запланированный расход будет удалён. Все отметки выполнения также удалятся.'
              : 'The planned expense will be deleted. All completion marks will also be removed.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingExpense(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => {
                if (deletingExpense) {
                  deletePlannedExpense(deletingExpense.expense.id);
                  setDeletingExpense(null);
                }
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Debt Payment Confirm */}
      <Modal isOpen={!!deletingDebtPayment} onClose={() => setDeletingDebtPayment(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? `Платёж по долгу от "${deletingDebtPayment?.personName}" будет удалён. Баланс счёта будет восстановлен.`
              : `Payment for debt from "${deletingDebtPayment?.personName}" will be deleted. Account balance will be restored.`}
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

      {/* Debt Payment Modal */}
      <Modal isOpen={!!payingDebt} onClose={() => setPayingDebt(null)} title={t.addPayment} fullHeight>
        {payingDebt && <DebtPaymentForm debt={payingDebt} onClose={() => setPayingDebt(null)} />}
      </Modal>

      {/* Delete Scheduled Payment Confirm */}
      <Modal isOpen={!!deletingScheduledPayment} onClose={() => setDeletingScheduledPayment(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? `Запланированный платёж для "${deletingScheduledPayment?.personName}" будет удалён.`
              : `Scheduled payment for "${deletingScheduledPayment?.personName}" will be deleted.`}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingScheduledPayment(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => {
                if (deletingScheduledPayment) {
                  deleteScheduledPayment(deletingScheduledPayment.debtId, deletingScheduledPayment.scheduledId);
                  setDeletingScheduledPayment(null);
                }
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        title={language === 'ru' ? 'Редактировать операцию' : 'Edit Transaction'}
        fullHeight
      >
        {editingTx && (
          <TransactionForm
            key={editingTx.id}
            editingTx={editingTx}
            onClose={() => setEditingTx(null)}
          />
        )}
      </Modal>

      {/* Edit Transfer Modal */}
      <Modal
        isOpen={!!editingTransfer}
        onClose={() => setEditingTransfer(null)}
        title={language === 'ru' ? 'Редактировать перевод' : 'Edit Transfer'}
        fullHeight
      >
        {editingTransfer && (
          <TransferForm
            key={editingTransfer.id}
            editingTx={editingTransfer}
            onClose={() => setEditingTransfer(null)}
          />
        )}
      </Modal>

      {/* Delete Transaction Confirm */}
      <Modal isOpen={!!deletingTxId} onClose={() => setDeletingTxId(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? 'Транзакция будет удалена, а баланс счёта пересчитан.'
              : 'Transaction will be deleted and account balance recalculated.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingTxId(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => { if (deletingTxId) { deleteTransaction(deletingTxId); setDeletingTxId(null); } }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Debt Payment Modal */}
      <Modal
        isOpen={!!editingDebtPayment}
        onClose={() => setEditingDebtPayment(null)}
        title={language === 'ru' ? 'Редактировать платёж' : 'Edit Payment'}
        fullHeight
      >
        {editingDebtPayment && (
          <EditDebtPaymentForm
            debt={editingDebtPayment.debt}
            payment={editingDebtPayment.payment}
            onClose={() => setEditingDebtPayment(null)}
          />
        )}
      </Modal>

      {/* Edit Debt Modal */}
      <Modal isOpen={!!editingDebt} onClose={() => setEditingDebt(null)} title={t.editDebt} fullHeight>
        {editingDebt && <DebtForm debt={editingDebt} onClose={() => setEditingDebt(null)} />}
      </Modal>
    </div>
  );
}
