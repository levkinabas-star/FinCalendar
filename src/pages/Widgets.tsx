import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, TrendingDown, TrendingUp, Calendar,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isToday,
} from 'date-fns';
import { useStore } from '../store';
import { translations } from '../translations';
import { useAddTransaction } from '../contexts/AddTransactionContext';
import { getDatesWithEventsInMonth, getDebtPaymentsInMonth, getScheduledPaymentsInMonth, getDebtsWithDueDateInMonth } from '../utils';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';

const BG     = '#07070F';
const BORDER = '#1E2A40';
const BTN_BG = '#1A1A2E';
const BLUE   = '#3B82F6';
const RED    = '#EF4444';
const GREEN  = '#10B981';
const YELLOW = '#F59E0B';
const PURPLE = '#8B5CF6';

// ─────────────────────────────────────────────────────────────────────────────
export default function Widgets() {
  const navigate = useNavigate();
  const { language } = useStore();
  const isRu = language === 'ru';

  const widgetCards = [
    {
      num: 1,
      size: isRu ? 'Маленький · 1×1' : 'Small · 1×1',
      title: isRu ? 'Одна кнопка' : 'Single button',
      desc: isRu
        ? 'Нажми «+» чтобы мгновенно добавить расход прямо с рабочего стола — без открытия приложения'
        : 'Tap "+" to instantly add an expense right from your home screen — without opening the app',
      preview: <Widget1 />,
    },
    {
      num: 2,
      size: isRu ? 'Средний · 2×1' : 'Medium · 2×1',
      title: isRu ? '3 быстрых действия' : '3 quick actions',
      desc: isRu
        ? 'Добавь расход, доход или открой «Календарь» в один тап — три самых частых действия всегда под рукой'
        : 'Add an expense, income, or open the Calendar in one tap — the three most common actions always at hand',
      preview: <Widget2 />,
    },
    {
      num: 3,
      size: isRu ? 'Большой · 4×4' : 'Large · 4×4',
      title: isRu ? 'Полный календарь' : 'Full calendar',
      desc: isRu
        ? 'Листай месяцы стрелками. Цветные точки показывают запланированные операции, транзакции и платежи. Нажми на день — откроется форма добавления'
        : 'Swipe months with arrows. Colored dots show planned expenses, transactions, and debt payments. Tap a day to add a transaction',
      preview: <Widget3 />,
      legend: true,
    },
  ];

  return (
    <div className="page-enter pb-32" style={{ background: BG, minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active-scale flex-shrink-0"
          style={{ background: BTN_BG, border: `1px solid ${BORDER}` }}
        >
          <ChevronLeft size={18} className="text-slate-300" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            {isRu ? 'Виджеты' : 'Widgets'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRu ? '3 виджета для рабочего стола Android' : '3 Android home screen widgets'}
          </p>
        </div>
      </div>

      {/* Widget cards */}
      <div className="px-5 space-y-8">
        {widgetCards.map((w) => (
          <div key={w.num}>
            {/* Card header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366F1 0%,#4F46E5 100%)' }}
              >
                {w.num}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{w.title}</p>
                <p className="text-xs text-slate-500">{w.size}</p>
              </div>
            </div>

            {/* Preview area */}
            <div
              className="rounded-3xl overflow-hidden p-5 flex justify-center mb-3"
              style={{ background: '#111120', border: `1px solid ${BORDER}` }}
            >
              {w.preview}
            </div>

            {/* Dot legend for Widget 3 */}
            {w.legend && (
              <div
                className="rounded-2xl px-4 py-3 mb-3 flex flex-wrap gap-x-4 gap-y-1.5"
                style={{ background: '#0E0E20', border: `1px solid ${BORDER}` }}
              >
                {([
                  { color: YELLOW, label: isRu ? 'Ожидает' : 'Pending' },
                  { color: GREEN,  label: isRu ? 'Выполнено' : 'Done' },
                  { color: BLUE,   label: isRu ? 'Операция' : 'Transaction' },
                  { color: PURPLE, label: isRu ? 'Долг' : 'Debt' },
                ] as { color: string; label: string }[]).map((item) => (
                  <div key={item.color} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <p className="text-xs text-slate-400 leading-relaxed px-1">{w.desc}</p>
          </div>
        ))}

        {/* ── How to add widget ── */}
        <div
          className="rounded-3xl p-5 space-y-4"
          style={{ background: '#0d2a1a', border: '1px solid #10B981' }}
        >
          <p className="text-sm font-bold text-emerald-400">
            {isRu ? '📲 Как добавить виджет на рабочий стол' : '📲 How to add a widget'}
          </p>
          <div className="space-y-3">
            {(isRu
              ? [
                  'Удержи палец на пустом месте рабочего стола',
                  'Нажми «Виджеты» в появившемся меню',
                  'Найди «FinCalendar» в списке виджетов',
                  'Выбери нужный виджет и перетащи его на экран',
                ]
              : [
                  'Long-press an empty area on your home screen',
                  'Tap "Widgets" in the popup menu',
                  'Find "FinCalendar" in the widgets list',
                  'Pick a widget and drag it onto the screen',
                ]
            ).map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white mt-0.5"
                  style={{ background: '#10B981' }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <div
            className="rounded-2xl px-4 py-3 mt-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <p className="text-xs text-emerald-400">
              {isRu
                ? '💡 После установки виджета откройте приложение — данные синхронизируются автоматически'
                : '💡 After placing the widget, open the app — data syncs automatically'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget 1 — Small add button (≈160×160dp)
// ─────────────────────────────────────────────────────────────────────────────
function Widget1() {
  const { language } = useStore();
  const { openAdd } = useAddTransaction();

  return (
    <button
      onClick={() => openAdd('expense')}
      className="active-scale flex flex-col items-center justify-between rounded-3xl p-4"
      style={{
        width: 160, height: 160,
        background: 'linear-gradient(135deg,#0F0F2A 0%,#0B0B1F 100%)',
        border: `1px solid ${BORDER}`,
      }}
    >
      <div className="w-full flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: BLUE + '33' }}>💰</div>
        <span className="text-[10px] font-semibold text-slate-400">{language === 'ru' ? 'Финансы' : 'Budget'}</span>
      </div>

      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ background: `linear-gradient(135deg,${BLUE} 0%,#2563EB 100%)`, boxShadow: `0 6px 24px ${BLUE}55` }}
      >
        <Plus size={32} color="white" strokeWidth={2.5} />
      </div>

      <span className="text-[11px] font-medium text-slate-400">{language === 'ru' ? 'Добавить' : 'Add'}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget 2 — Medium 3-button (≈320×160dp)
// ─────────────────────────────────────────────────────────────────────────────
function Widget2() {
  const { language } = useStore();
  const { openAdd } = useAddTransaction();
  const navigate = useNavigate();

  const actions = [
    { label: language === 'ru' ? 'Расход' : 'Expense', icon: <TrendingDown size={22} color={RED} />, bg: RED + '1A', border: RED + '44', onClick: () => openAdd('expense') },
    { label: language === 'ru' ? 'Доход' : 'Income',   icon: <TrendingUp size={22} color={GREEN} />, bg: GREEN + '1A', border: GREEN + '44', onClick: () => openAdd('income') },
    { label: language === 'ru' ? 'Календарь' : 'Calendar', icon: <Calendar size={22} color={BLUE} />, bg: BLUE + '1A', border: BLUE + '44', onClick: () => navigate('/calendar') },
  ];

  return (
    <div
      className="rounded-3xl p-4 flex flex-col justify-between"
      style={{ width: 312, height: 156, background: 'linear-gradient(135deg,#0F0F2A 0%,#0B0B1F 100%)', border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs" style={{ background: BLUE + '33' }}>💰</div>
        <span className="text-[10px] font-semibold text-slate-400">{language === 'ru' ? 'Финансы' : 'Budget'}</span>
      </div>

      <div className="flex gap-2 flex-1">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="active-scale flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl"
            style={{ background: a.bg, border: `1px solid ${a.border}` }}
          >
            {a.icon}
            <span className="text-[10px] font-semibold text-slate-300">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget 3 — Large calendar with month nav + all 4 dot types
// ─────────────────────────────────────────────────────────────────────────────
function Widget3() {
  const { language, transactions, plannedExpenses, debts } = useStore();
  const { openAdd } = useAddTransaction();
  const t = translations[language];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [addDate, setAddDate]         = useState<string | null>(null);
  const [addMode, setAddMode]         = useState<'expense' | 'income'>('expense');
  const [showForm, setShowForm]       = useState(false);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Real tx dates
  const txDates = useMemo(() => {
    const s = new Set<string>();
    transactions.forEach((tx) => s.add(tx.date));
    return s;
  }, [transactions]);

  // Real planned expense dates
  const eventMap = useMemo(() => getDatesWithEventsInMonth(plannedExpenses, year, month), [plannedExpenses, year, month]);

  // Real debt dates
  const debtDates = useMemo(() => {
    const s = new Set<string>();
    for (const d of Object.keys(getDebtPaymentsInMonth(debts, year, month))) s.add(d);
    for (const d of Object.keys(getScheduledPaymentsInMonth(debts, year, month))) s.add(d);
    for (const d of Object.keys(getDebtsWithDueDateInMonth(debts, year, month))) s.add(d);
    return s;
  }, [debts, year, month]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= monthEnd || days.length % 7 !== 0) {
    days.push(d);
    d = addDays(d, 1);
    if (days.length > 42) break;
  }

  const handleDayClick = (day: Date) => {
    if (!isSameMonth(day, currentDate)) return;
    setAddDate(format(day, 'yyyy-MM-dd'));
    setAddMode('expense');
    setShowForm(true);
  };

  return (
    <>
      <div
        className="rounded-3xl p-4"
        style={{ width: 312, background: 'linear-gradient(135deg,#0F0F2A 0%,#0B0B1F 100%)', border: `1px solid ${BORDER}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs" style={{ background: BLUE + '33' }}>💰</div>
            <span className="text-[10px] font-semibold text-slate-400">{language === 'ru' ? 'Финансы' : 'Budget'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-6 h-6 rounded-lg flex items-center justify-center active-scale" style={{ background: BTN_BG }}>
              <ChevronLeft size={13} className="text-slate-400" />
            </button>
            <span className="text-xs font-semibold text-slate-200 px-1 min-w-[90px] text-center">
              {t.months[month]} {year}
            </span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-6 h-6 rounded-lg flex items-center justify-center active-scale" style={{ background: BTN_BG }}>
              <ChevronRight size={13} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {t.weekdays.map((wd, i) => (
            <div key={i} className="text-center text-[9px] font-semibold py-0.5" style={{ color: i >= 5 ? BLUE : '#475569' }}>
              {wd}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day, idx) => {
            const dateStr  = format(day, 'yyyy-MM-dd');
            const inMonth  = isSameMonth(day, currentDate);
            const todayDay = isToday(day);
            const hasTx        = txDates.has(dateStr) && inMonth;
            const events       = inMonth ? eventMap[dateStr] : undefined;
            const hasPending   = (events?.pending ?? 0) > 0;
            const hasCompleted = (events?.completed ?? 0) > 0;
            const hasDebt      = debtDates.has(dateStr) && inMonth;
            const hasAny       = hasTx || hasPending || hasCompleted || hasDebt;

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(day)}
                disabled={!inMonth}
                className="flex flex-col items-center justify-center rounded-xl active-scale"
                style={{
                  height: 34,
                  background: todayDay ? `linear-gradient(135deg,${BLUE} 0%,#2563EB 100%)` : 'transparent',
                  opacity: inMonth ? 1 : 0,
                  cursor: inMonth ? 'pointer' : 'default',
                }}
              >
                <span className="text-[11px] font-semibold leading-none" style={{ color: todayDay ? 'white' : '#CBD5E1' }}>
                  {format(day, 'd')}
                </span>
                {hasAny && (
                  <div className="flex gap-px mt-0.5">
                    {hasPending   && <div className="rounded-full" style={{ width: 3, height: 3, background: todayDay ? 'rgba(255,255,255,0.85)' : YELLOW }} />}
                    {hasCompleted && <div className="rounded-full" style={{ width: 3, height: 3, background: todayDay ? 'rgba(255,255,255,0.85)' : GREEN }} />}
                    {hasTx        && <div className="rounded-full" style={{ width: 3, height: 3, background: todayDay ? 'rgba(255,255,255,0.85)' : BLUE }} />}
                    {hasDebt      && <div className="rounded-full" style={{ width: 3, height: 3, background: todayDay ? 'rgba(255,255,255,0.85)' : PURPLE }} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-center text-[9px] mt-2" style={{ color: '#475569' }}>
          {language === 'ru' ? 'Нажми на день чтобы добавить операцию' : 'Tap a day to add a transaction'}
        </p>
      </div>

      {/* Add form modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title=" " fullHeight>
        <div className="px-5 -mt-2 mb-4">
          <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#131325' }}>
            {([{ mode: 'expense' as const, label: language === 'ru' ? 'Расход' : 'Expense', color: RED },
               { mode: 'income'  as const, label: language === 'ru' ? 'Доход'  : 'Income',  color: GREEN }]
            ).map((tab) => (
              <button
                key={tab.mode}
                onClick={() => setAddMode(tab.mode)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active-scale"
                style={{ background: addMode === tab.mode ? tab.color : 'transparent', color: addMode === tab.mode ? 'white' : '#64748B' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {addDate && (
          <TransactionForm key={addMode + addDate} initialType={addMode} initialDate={addDate} onClose={() => setShowForm(false)} />
        )}
      </Modal>
    </>
  );
}
