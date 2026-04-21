import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { Debt, ScheduledPayment } from '../types';
import { formatAmount } from '../utils';

interface Props {
  debt: Debt;
  onClose: () => void;
}

export default function DebtPaymentForm({ debt, onClose }: Props) {
  const { language, accounts, addDebtPayment, addScheduledPayment, deleteDebt, deleteScheduledPayment, markScheduledAsPaid } = useStore();
  const t = translations[language];

  const remaining = debt.amount - debt.paidAmount;
  const futureScheduled = (debt.scheduledPayments ?? []).filter(p => p.dueDate >= format(new Date(), 'yyyy-MM-dd'));

  // Tab: 'pay' | 'schedule' | 'history'
  const [tab, setTab] = useState<'pay' | 'schedule' | 'history'>('pay');

  // Pay form — default to debt's linked account, fall back to first account
  const [accountId, setAccountId] = useState(debt.accountId ?? accounts[0]?.id ?? '');
  const [amount, setAmount] = useState(String(remaining));
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Schedule form
  const [schedAmount, setSchedAmount] = useState('');
  const [schedDate, setSchedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [schedNote, setSchedNote] = useState('');
  const [schedErrors, setSchedErrors] = useState<Record<string, string>>({});

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  function validatePay() {
    const e: Record<string, string> = {};
    const num = Number(amount);
    if (!accountId) e.account = t.accountRequired;
    if (!amount || isNaN(num) || num <= 0) e.amount = t.amountRequired;
    if (num > remaining) e.amount = language === 'ru'
      ? `Максимум ${formatAmount(remaining, debt.currency)}`
      : `Max ${formatAmount(remaining, debt.currency)}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateSchedule() {
    const e: Record<string, string> = {};
    const num = Number(schedAmount);
    if (!schedAmount || isNaN(num) || num <= 0) e.amount = t.amountRequired;
    if (!schedDate) e.date = language === 'ru' ? 'Выберите дату' : 'Select a date';
    const maxAmount = remaining - (debt.scheduledPayments ?? []).reduce((s, p) => s + p.amount, 0);
    if (num > maxAmount) e.amount = language === 'ru'
      ? `Макс. ${formatAmount(maxAmount, debt.currency)}`
      : `Max ${formatAmount(maxAmount, debt.currency)}`;
    setSchedErrors(e);
    return Object.keys(e).length === 0;
  }

  function handlePay() {
    if (!validatePay()) return;
    addDebtPayment(debt.id, { amount: Number(amount), note: note.trim(), date, accountId });
    onClose();
  }

  function handleSchedule() {
    if (!validateSchedule()) return;
    addScheduledPayment(debt.id, { amount: Number(schedAmount), dueDate: schedDate, note: schedNote.trim(), completedDates: [] });
    setSchedAmount('');
    setSchedNote('');
    setSchedErrors({});
    setTab('schedule');
  }

  function handleScheduledPay(sp: ScheduledPayment) {
    if (!accountId) { setErrors({ account: t.accountRequired }); return; }
    markScheduledAsPaid(debt.id, sp.id, accountId);
    onClose();
  }

  function handleDelete() {
    deleteDebt(debt.id);
    onClose();
  }

  const maxScheduled = remaining - (debt.scheduledPayments ?? []).reduce((s, p) => s + p.amount, 0);
  const isLent = debt.direction === 'lent';

  return (
    <div className="px-5 pb-8">
      {/* Tabs */}
      <div className="flex rounded-2xl p-1 gap-1 mb-5" style={{ background: '#0F0F23' }}>
        {([['pay', language === 'ru' ? 'Оплата' : 'Pay'], ['schedule', language === 'ru' ? 'Запланировать' : 'Schedule'], ['history', language === 'ru' ? 'История' : 'History']] as [string, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v as any)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active-scale"
            style={{
              background: tab === v
                ? (v === 'pay' ? '#3B82F6' : v === 'schedule' ? '#8B5CF6' : '#64748B')
                : 'transparent',
              color: tab === v ? 'white' : '#64748B',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* PAY TAB */}
      {tab === 'pay' && (
        <div className="space-y-4">
          {/* Debt info */}
          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
            <div>
              <p className="text-slate-400 text-xs mb-1">{isLent ? (language === 'ru' ? 'Должен мне' : 'Owes me') : (language === 'ru' ? 'Я должен' : 'I owe')}</p>
              <p className="text-slate-100 font-semibold">{debt.personName}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs mb-1">{t.remaining}</p>
              <p className="text-white font-bold text-lg">{formatAmount(remaining, debt.currency)}</p>
            </div>
          </div>

          {/* Account selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t.account}</label>
            <select
              value={accountId}
              onChange={(e) => { setAccountId(e.target.value); setErrors((p) => ({ ...p, account: '' })); }}
              className="w-full px-4 py-3 rounded-2xl text-slate-100 outline-none"
              style={{ background: '#1E1E38', border: errors.account ? '1px solid #EF4444' : '1px solid #1E2A40' }}
            >
              <option value="">{t.selectAccount}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.icon} {acc.name} ({formatAmount(acc.balance, acc.currency)})</option>
              ))}
            </select>
            {errors.account && <p className="text-red-400 text-xs mt-1">{errors.account}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t.paymentAmount}</label>
            <input
              type="number" inputMode="decimal"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
              style={{ background: '#1E1E38', border: errors.amount ? '1px solid #EF4444' : '1px solid #1E2A40' }}
            />
            {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t.paymentDate}</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-slate-100 outline-none"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40', colorScheme: 'dark' }}
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t.paymentNote}</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={language === 'ru' ? 'Примечание...' : 'Note...'}
              className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handlePay}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base active-scale"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
          >
            {t.addPayment}
          </button>
        </div>
      )}

      {/* SCHEDULE TAB */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {maxScheduled <= 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {language === 'ru' ? 'Вся сумма запланирована или долг закрыт' : 'All amount scheduled or debt is closed'}
            </div>
          ) : (
            <>
              {/* Scheduled payments list */}
              {(debt.scheduledPayments ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {language === 'ru' ? 'Запланированные платежи' : 'Scheduled payments'}
                  </p>
                  {(debt.scheduledPayments ?? []).map((sp) => (
                    <div key={sp.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#8B5CF620' }}>
                        <Calendar size={15} color="#8B5CF6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200">{formatAmount(sp.amount, debt.currency)}</p>
                        <p className="text-xs text-slate-500">{format(parseISO(sp.dueDate), 'dd.MM.yyyy')}</p>
                      </div>
                      <button
                        onClick={() => handleScheduledPay(sp)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold active-scale"
                        style={{ background: '#3B82F620', color: '#60A5FA', border: '1px solid #3B82F630' }}
                      >
                        {language === 'ru' ? 'Выполнить' : 'Done'}
                      </button>
                      <button
                        onClick={() => deleteScheduledPayment(debt.id, sp.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active-scale"
                        style={{ background: '#1E1E38' }}
                      >
                        <span className="text-red-400 text-sm">✕</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add scheduled payment */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {language === 'ru' ? 'Новый платёж' : 'New payment'}
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">{t.paymentAmount} ({language === 'ru' ? 'макс.' : 'max'} {formatAmount(maxScheduled, debt.currency)})</label>
                  <input
                    type="number" inputMode="decimal"
                    value={schedAmount} onChange={(e) => setSchedAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
                    style={{ background: '#1E1E38', border: schedErrors.amount ? '1px solid #EF4444' : '1px solid #1E2A40' }}
                  />
                  {schedErrors.amount && <p className="text-red-400 text-xs mt-1">{schedErrors.amount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">{t.debtDueDate}</label>
                  <input
                    type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-slate-100 outline-none"
                    style={{ background: '#1E1E38', border: schedErrors.date ? '1px solid #EF4444' : '1px solid #1E2A40', colorScheme: 'dark' }}
                  />
                  {schedErrors.date && <p className="text-red-400 text-xs mt-1">{schedErrors.date}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">{t.paymentNote}</label>
                  <input
                    type="text" value={schedNote} onChange={(e) => setSchedNote(e.target.value)}
                    placeholder={language === 'ru' ? 'Примечание...' : 'Note...'}
                    className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
                    style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
                  />
                </div>
                <button
                  onClick={handleSchedule}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm active-scale"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                >
                  {language === 'ru' ? 'Запланировать' : 'Schedule'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-4">
          {/* Delete debt */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 rounded-2xl font-semibold text-red-400 text-sm active-scale"
              style={{ background: '#1E1E38', border: '1px solid #EF444430' }}
            >
              {t.deleteDebt}
            </button>
          ) : (
            <div className="rounded-2xl p-4" style={{ background: '#1E1E38', border: '1px solid #EF444440' }}>
              <p className="text-sm text-slate-300 mb-3">{t.deleteDebtWarning}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl font-medium text-slate-300 active-scale text-sm"
                  style={{ background: '#0F0F23', border: '1px solid #1E2A40' }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white active-scale text-sm"
                  style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          )}

          {/* Payment history */}
          {debt.payments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.paymentHistory}</p>
              {debt.payments.map((p) => {
                const acc = accounts.find(a => a.id === p.accountId);
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isLent ? '#10B98120' : '#EF444420' }}>
                      <span className="text-lg">{isLent ? '💸' : '🤝'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{formatAmount(p.amount, debt.currency)}</p>
                      <p className="text-xs text-slate-500">{format(parseISO(p.date), 'dd.MM.yyyy')}{p.note ? ` · ${p.note}` : ''}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: isLent ? '#10B981' : '#EF4444' }}>
                      {isLent ? '+' : '-'}{formatAmount(p.amount, debt.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {debt.payments.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              {language === 'ru' ? 'Нет платежей' : 'No payments yet'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
