import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useStore } from '../store';
import { translations } from '../translations';
import { formatAmount } from '../utils';
import { Account, Debt } from '../types';
import Modal from '../components/Modal';
import AccountForm from '../components/AccountForm';
import DebtForm from '../components/DebtForm';
import DebtPaymentForm from '../components/DebtPaymentForm';
import { UpgradePrompt } from '../components/ProGate';
import { usePlan, FREE_LIMITS } from '../plan';

export default function Accounts() {
  const { language, accounts, deleteAccount, debts, deleteDebt } = useStore();
  const t = translations[language];
  const { canAddAccount, canAddDebt, isPro } = usePlan();
  const isRu = language === 'ru';
  const now = new Date();

  // Account modals
  const [showAdd, setShowAdd] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  // Debt state
  const [debtFilter, setDebtFilter] = useState<'active' | 'paid'>('active');
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);

  const activeDebts = useMemo(() => debts.filter((d) => d.status === 'active'), [debts]);
  const paidDebts = useMemo(() => debts.filter((d) => d.status === 'paid'), [debts]);

  const totalLent = useMemo(
    () => activeDebts.filter((d) => d.direction === 'lent').reduce((s, d) => s + (d.amount - d.paidAmount), 0),
    [activeDebts]
  );
  const totalBorrowed = useMemo(
    () => activeDebts.filter((d) => d.direction === 'borrowed').reduce((s, d) => s + (d.amount - d.paidAmount), 0),
    [activeDebts]
  );
  const netDebt = totalBorrowed - totalLent;

  const filteredDebts = debtFilter === 'active' ? activeDebts : paidDebts;

  return (
    <div className="page-enter pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <h1 className="text-2xl font-bold text-slate-100">{t.myAccounts}</h1>
        <button
          onClick={() => canAddAccount ? setShowAdd(true) : null}
          className="w-10 h-10 rounded-full flex items-center justify-center active-scale"
          style={{ background: canAddAccount ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' : '#1E2A40' }}
          title={!canAddAccount ? (isRu ? `Лимит: ${FREE_LIMITS.accounts} счёта` : `Limit: ${FREE_LIMITS.accounts} accounts`) : undefined}
        >
          <Plus size={20} color="white" />
        </button>
      </div>

      {/* Free plan limit banner */}
      {!isPro && !canAddAccount && (
        <div className="px-5 mb-4">
          <UpgradePrompt
            message={`Достигнут лимит: ${FREE_LIMITS.accounts} счёта. Перейдите на Pro для неограниченного количества счетов.`}
            messageEn={`Limit reached: ${FREE_LIMITS.accounts} accounts. Upgrade to Pro for unlimited accounts.`}
          />
        </div>
      )}

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">{t.noAccounts}</h3>
          <p className="text-slate-500 text-sm mb-6">
            {language === 'ru'
              ? 'Добавьте первый счёт, чтобы начать отслеживать бюджет'
              : 'Add your first account to start tracking your budget'}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-6 py-3 rounded-2xl font-semibold text-white active-scale"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
          >
            {t.addAccount}
          </button>
        </div>
      ) : (
        <div className="px-5 grid grid-cols-1 gap-4 mb-6">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onEdit={() => setEditingAccount(acc)}
              onDelete={() => setDeletingAccount(acc)}
              language={language}
            />
          ))}
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-2xl p-4 flex items-center justify-center gap-2 active-scale"
            style={{ background: 'transparent', border: '2px dashed #1E2A40', minHeight: 80 }}
          >
            <Plus size={20} className="text-slate-500" />
            <span className="text-slate-500 font-medium">{t.addAccount}</span>
          </button>
        </div>
      )}

      {/* ═══════════ DEBTS SECTION ═══════════ */}
      <div className="px-5">
        {/* Debts header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{t.debts}</h2>
          <button
            onClick={() => setShowAddDebt(true)}
            className="flex items-center gap-1 text-xs font-medium active-scale"
            style={{ color: canAddDebt ? '#A78BFA' : '#F59E0B' }}
          >
            {canAddDebt ? <Plus size={13} /> : <Crown size={13} />}
            {canAddDebt
              ? t.addDebt
              : (isRu ? `Лимит ${FREE_LIMITS.debts}` : `Limit ${FREE_LIMITS.debts}`)}
          </button>
        </div>

        {/* Free plan debt limit banner */}
        {!isPro && !canAddDebt && (
          <div className="mb-3">
            <UpgradePrompt
              message={`Достигнут лимит: ${FREE_LIMITS.debts} долга. Перейдите на Pro для неограниченного количества долгов.`}
              messageEn={`Limit reached: ${FREE_LIMITS.debts} debts. Upgrade to Pro for unlimited debt tracking.`}
            />
          </div>
        )}

        {/* Debt summary card */}
        {debts.length > 0 && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <TrendingUp size={15} color="#10B981" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">{language === 'ru' ? 'Должны мне' : 'Owe me'}</p>
                  <p className="text-sm font-bold text-emerald-400">{formatAmount(totalLent, 'RUB')}</p>
                </div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <TrendingDown size={15} color="#EF4444" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">{language === 'ru' ? 'Я должен' : 'I owe'}</p>
                  <p className="text-sm font-bold text-red-400">{formatAmount(totalBorrowed, 'RUB')}</p>
                </div>
              </div>
            </div>
            {netDebt !== 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <p className="text-xs text-slate-500">{language === 'ru' ? 'Чистый долг' : 'Net debt'}</p>
                <p className="text-sm font-bold" style={{ color: netDebt > 0 ? '#EF4444' : '#10B981' }}>
                  {netDebt > 0
                    ? `-${formatAmount(netDebt, 'RUB')}`
                    : `+${formatAmount(Math.abs(netDebt), 'RUB')}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Active / Paid filter tabs */}
        {debts.length > 0 && (
          <div className="flex rounded-2xl p-1 gap-1 mb-4" style={{ background: '#0A0A1C' }}>
            {(['active', 'paid'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDebtFilter(f)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active-scale"
                style={{
                  background: debtFilter === f
                    ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                    : 'transparent',
                  color: debtFilter === f ? 'white' : '#64748B',
                }}
              >
                {f === 'active'
                  ? `${t.debtActive}${activeDebts.length > 0 ? ` (${activeDebts.length})` : ''}`
                  : `${t.debtPaid}${paidDebts.length > 0 ? ` (${paidDebts.length})` : ''}`}
              </button>
            ))}
          </div>
        )}

        {/* Debt cards */}
        {debts.length === 0 ? (
          <button
            onClick={() => setShowAddDebt(true)}
            className="w-full rounded-2xl p-5 flex items-center gap-3 active-scale mb-4"
            style={{ background: '#0E0E1C', border: '1px solid #8B5CF625' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#8B5CF615' }}>
              <span className="text-2xl">🤝</span>
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-slate-200">{t.debts}</p>
              <p className="text-xs text-slate-500">{language === 'ru' ? 'Кто кому должен' : 'Track who owes whom'}</p>
            </div>
            <Plus size={18} className="text-slate-500" />
          </button>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">{debtFilter === 'active' ? t.noActiveDebts : t.noDebts}</p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {filteredDebts.map((d) => (
              <DebtCard
                key={d.id}
                debt={d}
                language={language}
                now={now}
                onPay={() => setPayingDebt(d)}
                onEdit={() => setEditingDebt(d)}
                onDelete={() => setDeletingDebtId(d.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════ ACCOUNT MODALS ═══════════ */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={t.addAccount} fullHeight>
        <AccountForm onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal isOpen={!!editingAccount} onClose={() => setEditingAccount(null)} title={t.editAccount} fullHeight>
        {editingAccount && (
          <AccountForm account={editingAccount} onClose={() => setEditingAccount(null)} />
        )}
      </Modal>

      <Modal isOpen={!!deletingAccount} onClose={() => setDeletingAccount(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">{t.deleteAccountWarning}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingAccount(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
            >
              {t.cancel}
            </button>
            <button
              onClick={() => {
                if (deletingAccount) {
                  deleteAccount(deletingAccount.id);
                  setDeletingAccount(null);
                }
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
            >
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══════════ DEBT MODALS ═══════════ */}
      <Modal isOpen={showAddDebt} onClose={() => setShowAddDebt(false)} title={t.addDebt} fullHeight>
        <DebtForm onClose={() => setShowAddDebt(false)} />
      </Modal>

      <Modal isOpen={!!payingDebt} onClose={() => setPayingDebt(null)} title={t.addPayment} fullHeight>
        {payingDebt && <DebtPaymentForm debt={payingDebt} onClose={() => setPayingDebt(null)} />}
      </Modal>

      <Modal isOpen={!!editingDebt} onClose={() => setEditingDebt(null)} title={t.editDebt} fullHeight>
        {editingDebt && <DebtForm debt={editingDebt} onClose={() => setEditingDebt(null)} />}
      </Modal>

      <Modal isOpen={!!deletingDebtId} onClose={() => setDeletingDebtId(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? t.deleteDebtWarning
              : 'This debt and all its payment history will be permanently deleted.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingDebtId(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
            >
              {t.cancel}
            </button>
            <button
              onClick={() => {
                if (deletingDebtId) {
                  deleteDebt(deletingDebtId);
                  setDeletingDebtId(null);
                }
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
            >
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// DebtCard component
// ─────────────────────────────────────────────
function DebtCard({
  debt: d,
  language,
  now,
  onPay,
  onEdit,
  onDelete,
}: {
  debt: Debt;
  language: string;
  now: Date;
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { accounts } = useStore();

  const isLent = d.direction === 'lent';
  const isPaid = d.status === 'paid';
  const remaining = d.amount - d.paidAmount;
  const pct = d.amount > 0 ? Math.min((d.paidAmount / d.amount) * 100, 100) : 0;
  const barColor = isPaid ? '#10B981' : isLent ? '#10B981' : '#EF4444';

  const isOverdue = !isPaid && !!d.dueDate && differenceInDays(parseISO(d.dueDate), now) < 0;
  const isDueSoon = !isPaid && !isOverdue && !!d.dueDate && differenceInDays(parseISO(d.dueDate), now) <= 7;

  // Next scheduled payment
  const futureScheduled = d.scheduledPayments
    .filter((sp) => parseISO(sp.dueDate) >= now)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextSp = futureScheduled[0];
  const hasInstallments = d.scheduledPayments.length > 0;

  const getAcc = (id?: string) => id ? accounts.find((a) => a.id === id) : undefined;

  const borderColor = isPaid ? '#10B98130' : isOverdue ? '#EF444430' : isDueSoon ? '#F59E0B30' : '#1E2A40';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#0E0E1C', border: `1px solid ${borderColor}` }}
    >
      {/* Top color stripe */}
      <div className="h-0.5" style={{ background: barColor, opacity: 0.6 }} />

      <div className="p-4">
        {/* Row 1: Icon + Name + Status + Amount */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: isLent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}
          >
            {isLent ? '💸' : '🤝'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-100 truncate">{d.personName}</p>
              {isOverdue && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg" style={{ background: '#EF444420' }}>
                  <AlertCircle size={10} color="#EF4444" />
                  <span className="text-[10px] font-bold text-red-400">
                    {language === 'ru' ? 'Просрочен' : 'Overdue'}
                  </span>
                </div>
              )}
              {isDueSoon && !isOverdue && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg" style={{ background: '#F59E0B20' }}>
                  <span className="text-[10px] font-bold text-amber-400">
                    {language === 'ru' ? 'Скоро срок' : 'Due soon'}
                  </span>
                </div>
              )}
              {isPaid && (
                <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 rounded-lg" style={{ background: '#10B98120' }}>
                  {language === 'ru' ? 'Погашен' : 'Paid'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLent ? (language === 'ru' ? 'Должен мне' : 'Owes me') : (language === 'ru' ? 'Я должен' : 'I owe')}
              {d.dueDate && ` · ${language === 'ru' ? 'до' : 'due'} ${format(parseISO(d.dueDate), 'dd.MM.yy')}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-base font-bold" style={{ color: isPaid ? '#10B981' : isLent ? '#10B981' : '#EF4444' }}>
              {formatAmount(remaining, d.currency)}
            </p>
            <p className="text-[10px] text-slate-500">
              {language === 'ru' ? 'из' : 'of'} {formatAmount(d.amount, d.currency)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">
              {language === 'ru' ? 'Оплачено' : 'Paid'}: {formatAmount(d.paidAmount, d.currency)}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: barColor }}>
              {Math.round(pct)}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E2A40' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}99, ${barColor})` }}
            />
          </div>
        </div>

        {/* Installments info */}
        {hasInstallments && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl mb-3 active-scale"
            style={{ background: '#131325', border: '1px solid #1E2A40' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">📅</span>
              <div className="text-left">
                <p className="text-xs font-medium text-slate-300">
                  {language === 'ru' ? 'Рассрочка' : 'Installments'}: {d.scheduledPayments.length}{' '}
                  {language === 'ru' ? 'платежей' : 'payments'}
                </p>
                {nextSp && (
                  <p className="text-[10px] text-slate-500">
                    {language === 'ru' ? 'Следующий' : 'Next'}: {format(parseISO(nextSp.dueDate), 'dd.MM.yy')} · {formatAmount(nextSp.amount, d.currency)}
                  </p>
                )}
                {!nextSp && futureScheduled.length === 0 && (
                  <p className="text-[10px] text-emerald-400">
                    {language === 'ru' ? 'Все платежи выполнены' : 'All payments done'}
                  </p>
                )}
              </div>
            </div>
            {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </button>
        )}

        {/* Expanded scheduled payments list */}
        {hasInstallments && expanded && (
          <div className="space-y-1.5 mb-3">
            {d.scheduledPayments
              .slice()
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .map((sp) => {
                const spDate = parseISO(sp.dueDate);
                const isSpPast = spDate < now;
                const spAcc = getAcc(sp.sourceAccountId);
                return (
                  <div
                    key={sp.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: '#0A0A1C', opacity: isSpPast ? 0.5 : 1 }}
                  >
                    <span className="text-xs" style={{ color: isSpPast ? '#64748B' : '#94A3B8' }}>
                      {format(spDate, 'dd.MM.yy')}
                    </span>
                    <span className="flex-1 text-xs font-medium" style={{ color: isSpPast ? '#64748B' : '#CBD5E1' }}>
                      {formatAmount(sp.amount, d.currency)}
                    </span>
                    {spAcc && (
                      <span className="text-[10px] text-slate-500">{spAcc.icon} {spAcc.name}</span>
                    )}
                    {sp.note && (
                      <span className="text-[10px] text-slate-600 truncate max-w-[80px]">{sp.note}</span>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Description */}
        {d.description && (
          <p className="text-xs text-slate-500 mb-3 truncate">{d.description}</p>
        )}

        {/* Action buttons */}
        {!isPaid && (
          <div className="flex items-center gap-2">
            <button
              onClick={onPay}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold active-scale"
              style={{ background: '#3B82F620', color: '#60A5FA', border: '1px solid #3B82F630' }}
            >
              {language === 'ru' ? 'Выполнить' : 'Done'}
            </button>
            <button
              onClick={onEdit}
              className="w-9 h-9 rounded-xl flex items-center justify-center active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
            >
              <Pencil size={14} className="text-slate-400" />
            </button>
            <button
              onClick={onDelete}
              className="w-9 h-9 rounded-xl flex items-center justify-center active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
            >
              <Trash2 size={14} color="#EF4444" />
            </button>
          </div>
        )}
        {isPaid && (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="w-9 h-9 rounded-xl flex items-center justify-center active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
            >
              <Pencil size={14} className="text-slate-400" />
            </button>
            <button
              onClick={onDelete}
              className="w-9 h-9 rounded-xl flex items-center justify-center active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
            >
              <Trash2 size={14} color="#EF4444" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AccountCard component
// ─────────────────────────────────────────────
function AccountCard({
  account,
  onEdit,
  onDelete,
  language,
}: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  language: string;
}) {
  const { transactions, plannedExpenses } = useStore();
  const txCount = transactions.filter((t) => t.accountId === account.id).length;
  const plannedCount = plannedExpenses.filter((p) => p.accountId === account.id).length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${account.color}18 0%, ${account.color}08 100%)`,
        border: `1px solid ${account.color}25`,
      }}
    >
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${account.color}, ${account.color}44)` }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `${account.color}20` }}
            >
              {account.icon}
            </div>
            <div>
              <p className="font-semibold text-slate-100">{account.name}</p>
              <p className="text-xs text-slate-500">{account.currency}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-xl flex items-center justify-center active-scale"
              style={{ background: '#1E1E38' }}
            >
              <Pencil size={14} className="text-slate-400" />
            </button>
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-xl flex items-center justify-center active-scale"
              style={{ background: '#1E1E38' }}
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">{language === 'ru' ? 'Баланс' : 'Balance'}</p>
            <p
              className="text-2xl font-bold"
              style={{ color: account.balance >= 0 ? '#F1F5F9' : '#EF4444' }}
            >
              {formatAmount(account.balance, account.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">
              {txCount} {language === 'ru' ? 'операций' : 'transactions'}
            </p>
            <p className="text-xs text-slate-500">
              {plannedCount} {language === 'ru' ? 'запланировано' : 'planned'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
