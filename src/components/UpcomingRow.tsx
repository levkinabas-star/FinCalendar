import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO, addDays } from 'date-fns';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { PlannedExpense, ScheduledPayment, Debt, Category, Account } from '../types';
import { formatAmount } from '../utils';

export type UpcomingItemType =
  | { kind: 'planned'; expense: PlannedExpense; date: string }
  | { kind: 'debt'; payment: ScheduledPayment; debt: Debt; date: string };

interface Props {
  item: UpcomingItemType;
  idx: number;
  total: number;
  getCat: (id: string) => Category | undefined;
  getAcc: (id: string) => Account | undefined;
  language: string;
  today: string;
  showDaysUntil?: boolean;
  onMarkNoDeduction?: (expenseId: string, date: string) => void;
  onTogglePlanned?: (expenseId: string, date: string) => void;
  onEditPlanned?: (expense: PlannedExpense) => void;
  onDeletePlanned?: (expenseId: string, date: string) => void;
  onToggleDebtScheduled?: (debtId: string, scheduledId: string, date: string) => void;
  onPayDebtScheduled?: (debtId: string, scheduledId: string, accountId: string) => void;
  accounts?: Account[];
}

export default function UpcomingRow({
  item, idx, total, getCat, getAcc, language, today, showDaysUntil,
  onMarkNoDeduction, onTogglePlanned, onEditPlanned, onDeletePlanned,
  onToggleDebtScheduled, onPayDebtScheduled, accounts,
}: Props) {
  const date = item.date;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const isTodayDate = date === todayStr;
  const isTomorrow = date === tomorrowStr;
  const daysUntil = Math.ceil((parseISO(date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);

  const dateLabel = isTodayDate
    ? today
    : isTomorrow
      ? (language === 'ru' ? 'Завтра' : 'Tomorrow')
      : format(parseISO(date), language === 'ru' ? 'd MMM' : 'MMM d');

  const borderBottom = idx < total - 1 ? '1px solid #1E2A40' : 'none';

  if (item.kind === 'debt') {
    const { payment, debt } = item;
    const isLent = debt.direction === 'lent';
    const acc = getAcc(payment.sourceAccountId ?? '');
    return (
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#0E0E1C', borderBottom }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isLent ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
          <span className="text-lg">{isLent ? '💸' : '🤝'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {debt.personName}{payment.note ? ` · ${payment.note}` : ''}
          </p>
          <p className="text-xs text-slate-500">
            {dateLabel}{acc ? ` · ${acc.name}` : ''}{` · ${language === 'ru' ? 'Долг' : 'Debt'}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold" style={{ color: isLent ? '#10B981' : '#EF4444' }}>
            {isLent ? '+' : '-'}{formatAmount(payment.amount, debt.currency)}
          </p>
          {showDaysUntil && daysUntil > 0 && (
            <p className="text-[10px] text-slate-500">
              {language === 'ru' ? `через ${daysUntil} дн.` : `in ${daysUntil}d`}
            </p>
          )}
          <div className="flex items-center gap-1 justify-end mt-1">
            {onPayDebtScheduled && !payment.completedDates?.includes(date) && (
              <button
                onClick={() => {
                  const accId = payment.sourceAccountId || accounts?.[0]?.id;
                  if (accId) onPayDebtScheduled(debt.id, payment.id, accId);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center active-scale"
                style={{ background: '#3B82F620' }}
                title={language === 'ru' ? 'Выполнить' : 'Done'}
              >
                <Check size={12} color="#60A5FA" />
              </button>
            )}
            {onToggleDebtScheduled && (
              <button
                onClick={() => onToggleDebtScheduled(debt.id, payment.id, date)}
                className="w-8 h-8 rounded-lg flex items-center justify-center active-scale"
                style={{ background: '#1E1E38' }}
                title={language === 'ru' ? 'Выполнено (без списания)' : 'Done (no deduction)'}
              >
                <Check size={12} color={payment.completedDates?.includes(date) ? '#A855F7' : '#475569'} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { expense } = item;
  const cat = getCat(expense.categoryId);
  const acc = getAcc(expense.accountId);
  const isIncome = expense.type === 'income';
  const [showDoneMenu, setShowDoneMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const doneButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#0E0E1C', borderBottom }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${cat?.color ?? '#94A3B8'}22` }}>
        <span className="text-lg">{cat?.icon ?? '📌'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">
          {expense.description || (language === 'ru' ? cat?.name : cat?.nameEn) || '—'}
        </p>
        <p className="text-xs text-slate-500">
          {dateLabel}{acc ? ` · ${acc.name}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <p className="text-sm font-semibold mr-2" style={{ color: isIncome ? '#10B981' : '#EF4444' }}>
          {isIncome ? '+' : '-'}{formatAmount(expense.amount, expense.currency)}
        </p>
        <div className="relative">
          <button
            ref={doneButtonRef}
            onClick={() => {
              if (!showDoneMenu) {
                const rect = doneButtonRef.current?.getBoundingClientRect();
                if (rect) setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
              }
              setShowDoneMenu(!showDoneMenu);
            }}
            className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
            style={{ background: '#3B82F620' }}
            aria-label={language === 'ru' ? 'Выполнить' : 'Done'}
            aria-expanded={showDoneMenu}
          >
            <Check size={16} color="#60A5FA" />
          </button>
          {showDoneMenu && menuPos && createPortal(
            <>
              <div className="fixed inset-0" style={{ zIndex: 300 }} onClick={() => setShowDoneMenu(false)} />
              <div
                className="fixed rounded-xl overflow-hidden shadow-lg"
                style={{ top: menuPos.top, right: menuPos.right, zIndex: 301, background: '#1E1E38', border: '1px solid #1E2A40', minWidth: 160 }}
              >
                <button
                  onClick={() => { onTogglePlanned?.(expense.id, date); setShowDoneMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 active-scale"
                  style={{ color: '#F1F5F9' }}
                >
                  <Check size={14} color="#60A5FA" />
                  <span>{language === 'ru' ? 'Со списанием' : 'With deduction'}</span>
                </button>
                <div style={{ height: 1, background: '#1E2A40' }} />
                <button
                  onClick={() => { onMarkNoDeduction?.(expense.id, date); setShowDoneMenu(false); }}
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
        {onEditPlanned && (
          <button
            onClick={() => onEditPlanned(expense)}
            className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
            style={{ background: '#1E1E38' }}
            aria-label={language === 'ru' ? 'Редактировать' : 'Edit'}
          >
            <Pencil size={14} color="#94A3B8" />
          </button>
        )}
        {onDeletePlanned && (
          <button
            onClick={() => onDeletePlanned(expense.id, date)}
            className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
            style={{ background: '#1E1E38' }}
            aria-label={language === 'ru' ? 'Удалить' : 'Delete'}
          >
            <Trash2 size={14} color="#EF4444" />
          </button>
        )}
      </div>
    </div>
  );
}
