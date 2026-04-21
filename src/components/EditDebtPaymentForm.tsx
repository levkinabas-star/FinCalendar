import { useState } from 'react';
import { useStore } from '../store';
import { translations } from '../translations';
import { Debt, DebtPayment } from '../types';
import { formatAmount } from '../utils';

interface Props {
  debt: Debt;
  payment: DebtPayment;
  onClose: () => void;
}

export default function EditDebtPaymentForm({ debt, payment, onClose }: Props) {
  const { language, accounts, updateDebtPayment } = useStore();
  const t = translations[language];

  const [amount, setAmount] = useState(String(payment.amount));
  const [date, setDate] = useState(payment.date);
  const [note, setNote] = useState(payment.note ?? '');
  const [accountId, setAccountId] = useState(payment.accountId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isLent = debt.direction === 'lent';

  function validate() {
    const e: Record<string, string> = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = t.amountRequired;
    if (!accountId) e.accountId = t.accountRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    updateDebtPayment(debt.id, payment.id, {
      accountId,
      amount: Number(amount),
      date,
      note,
    });
    onClose();
  }

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Debt info header */}
      <div
        className="flex items-center gap-3 p-3 rounded-2xl"
        style={{ background: '#0F0F23', border: '1px solid #1E2A40' }}
      >
        <span className="text-2xl">{isLent ? '💸' : '🤝'}</span>
        <div>
          <p className="text-sm font-semibold text-slate-200">{debt.personName}</p>
          <p className="text-xs text-slate-500">
            {isLent
              ? language === 'ru' ? 'Должен мне' : 'Owes me'
              : language === 'ru' ? 'Я должен' : 'I owe'}
            {' · '}{formatAmount(debt.amount, debt.currency)}
          </p>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">{t.paymentAmount}</label>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
          style={{
            background: '#1E1E38',
            border: errors.amount ? '1px solid #EF4444' : '1px solid #1E2A40',
          }}
        />
        {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">{t.paymentDate}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-slate-100 outline-none"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', colorScheme: 'dark' }}
        />
      </div>

      {/* Account */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">{t.account}</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full px-3 py-3 rounded-2xl text-slate-100 outline-none"
          style={{
            background: '#1E1E38',
            border: errors.accountId ? '1px solid #EF4444' : '1px solid #1E2A40',
          }}
        >
          <option value="">{t.selectAccount}</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.currency})
            </option>
          ))}
        </select>
        {errors.accountId && <p className="text-red-400 text-xs mt-1">{errors.accountId}</p>}
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">{t.paymentNote}</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={language === 'ru' ? 'Примечание...' : 'Note...'}
          className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3.5 rounded-2xl font-medium text-slate-300 active-scale"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
        >
          {t.cancel}
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-white active-scale"
          style={{
            background: isLent
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          }}
        >
          {t.save}
        </button>
      </div>
    </div>
  );
}
