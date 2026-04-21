import { useState } from 'react';
import { format, addWeeks, addMonths, addYears, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { Debt, DebtDirection, Currency, RecurringFrequency, ScheduledPayment } from '../types';
import { ALL_CURRENCIES, formatAmount, CURRENCY_SYMBOLS } from '../utils';
import { usePlan, FREE_LIMITS } from '../plan';

interface Props {
  debt?: Debt;
  onClose: () => void;
}

export default function DebtForm({ debt, onClose }: Props) {
  const { language, defaultCurrency, accounts, addDebt, updateDebt } = useStore();
  const t = translations[language];
  const { canAddDebt, isPro } = usePlan();
  const navigate = useNavigate();
  const isRu = language === 'ru';

  const [direction, setDirection] = useState<DebtDirection>(debt?.direction ?? 'lent');
  const [personName, setPersonName] = useState(debt?.personName ?? '');
  const [amount, setAmount] = useState(debt ? String(debt.amount) : '');
  const [currency, setCurrency] = useState<Currency>(debt?.currency ?? defaultCurrency);
  const [description, setDescription] = useState(debt?.description ?? '');
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? '');
  const [accountId, setAccountId] = useState(debt?.accountId ?? '');

  // Installment state (only for new debts)
  const [paymentType, setPaymentType] = useState<'single' | 'installment'>('single');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentFrequency, setInstallmentFrequency] = useState<RecurringFrequency>('monthly');
  const [installmentStartDate, setInstallmentStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  function generateInstallments(): Omit<ScheduledPayment, 'id'>[] {
    const total = Number(amount);
    const perPayment = Number(installmentAmount);
    if (!total || !perPayment || perPayment <= 0) return [];

    const count = Math.ceil(total / perPayment);
    const payments: Omit<ScheduledPayment, 'id'>[] = [];
    let current = parseISO(installmentStartDate);
    let remaining = total;

    for (let i = 0; i < count; i++) {
      const amt = parseFloat(Math.min(perPayment, remaining).toFixed(2));
      payments.push({
        amount: amt,
        dueDate: format(current, 'yyyy-MM-dd'),
        note: '',
        sourceAccountId: sourceAccountId || undefined,
        completedDates: [],
      });
      remaining = parseFloat((remaining - amt).toFixed(2));
      if (remaining <= 0) break;

      if (installmentFrequency === 'weekly') current = addWeeks(current, 1);
      else if (installmentFrequency === 'monthly') current = addMonths(current, 1);
      else current = addYears(current, 1);
    }

    return payments;
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!personName.trim()) e.personName = t.nameRequired;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = t.amountRequired;
    if (!debt && paymentType === 'installment') {
      if (!installmentAmount || isNaN(Number(installmentAmount)) || Number(installmentAmount) <= 0) {
        e.installmentAmount = t.amountRequired;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const data = {
      direction,
      personName: personName.trim(),
      amount: Number(amount),
      currency,
      description: description.trim(),
      dueDate: dueDate || undefined,
      accountId: accountId || undefined,
    };
    if (debt) {
      updateDebt(debt.id, data);
    } else {
      // For installments, propagate accountId as sourceAccountId on each payment
      const installments = paymentType === 'installment'
        ? generateInstallments().map((p) => ({ ...p, sourceAccountId: p.sourceAccountId || accountId || undefined }))
        : undefined;
      addDebt({ ...data, initialScheduledPayments: installments });
    }
    onClose();
  }

  const installmentCount =
    amount && installmentAmount && Number(installmentAmount) > 0
      ? Math.ceil(Number(amount) / Number(installmentAmount))
      : 0;

  const freqLabel = (short = false) => {
    if (installmentFrequency === 'weekly') return language === 'ru' ? (short ? 'нед.' : 'каждую неделю') : (short ? 'wk' : 'weekly');
    if (installmentFrequency === 'monthly') return language === 'ru' ? (short ? 'мес.' : 'каждый месяц') : (short ? 'mo' : 'monthly');
    return language === 'ru' ? (short ? 'год' : 'каждый год') : (short ? 'yr' : 'yearly');
  };

  if (!canAddDebt && !debt) {
    return (
      <div className="px-5 pb-8 flex flex-col items-center gap-5 pt-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}>
          <Crown size={28} color="white" />
        </div>
        <div className="text-center">
          <p className="text-slate-100 font-bold text-lg mb-2">
            {isRu ? `Лимит: ${FREE_LIMITS.debts} долга` : `Limit: ${FREE_LIMITS.debts} debts`}
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            {isRu
              ? `Бесплатный план позволяет создать до ${FREE_LIMITS.debts} долгов. Перейдите на Pro для неограниченного учёта долгов.`
              : `The free plan allows up to ${FREE_LIMITS.debts} debts. Upgrade to Pro for unlimited debt tracking.`}
          </p>
        </div>
        <button
          onClick={() => { onClose(); navigate('/pricing'); }}
          className="w-full py-3.5 rounded-2xl font-bold text-white active-scale"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}
        >
          {isRu ? 'Перейти к тарифам' : 'View Plans'}
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Direction toggle */}
      <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#0F0F23' }}>
        {(['lent', 'borrowed'] as DebtDirection[]).map((dir) => {
          const active = direction === dir;
          return (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active-scale"
              style={{
                background: active
                  ? dir === 'lent'
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                  : 'transparent',
                color: active ? 'white' : '#64748B',
              }}
            >
              {dir === 'lent'
                ? language === 'ru' ? '💸 Дал в долг' : '💸 I lent'
                : language === 'ru' ? '🤝 Взял в долг' : '🤝 I borrowed'}
            </button>
          );
        })}
      </div>

      {/* Account picker */}
      {accounts.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            {language === 'ru' ? 'Счёт' : 'Account'}
            <span className="ml-1 text-slate-600 font-normal">
              {language === 'ru' ? '(баланс изменится)' : '(balance will change)'}
            </span>
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setAccountId('')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm active-scale transition-all"
              style={{
                background: accountId === '' ? 'rgba(100,116,139,0.2)' : '#1E1E38',
                border: accountId === '' ? '1.5px solid #64748B' : '1.5px solid #1E2A40',
              }}
            >
              <span className="text-slate-400 text-xs font-medium">
                {language === 'ru' ? 'Не указан' : 'None'}
              </span>
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setAccountId(acc.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm active-scale transition-all"
                style={{
                  background: accountId === acc.id ? `${acc.color}22` : '#1E1E38',
                  border: accountId === acc.id ? `1.5px solid ${acc.color}` : '1.5px solid #1E2A40',
                }}
              >
                <span>{acc.icon}</span>
                <span className="text-slate-200 font-medium">{acc.name}</span>
                <span className="text-xs" style={{ color: acc.color }}>
                  {CURRENCY_SYMBOLS[acc.currency]}{acc.balance.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                </span>
              </button>
            ))}
          </div>
          {accountId && (
            <p className="text-xs mt-2 px-1" style={{ color: direction === 'lent' ? '#EF4444' : '#10B981' }}>
              {direction === 'lent'
                ? `${language === 'ru' ? 'Баланс уменьшится на' : 'Balance will decrease by'} ${amount ? formatAmount(Number(amount), currency) : '...'}`
                : `${language === 'ru' ? 'Баланс увеличится на' : 'Balance will increase by'} ${amount ? formatAmount(Number(amount), currency) : '...'}`}
            </p>
          )}
        </div>
      )}

      {/* Person name */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">{t.debtPerson}</label>
        <input
          type="text"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder={language === 'ru' ? 'Имя человека...' : 'Person name...'}
          className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
          style={{ background: '#1E1E38', border: errors.personName ? '1px solid #EF4444' : '1px solid #1E2A40' }}
        />
        {errors.personName && <p className="text-red-400 text-xs mt-1">{errors.personName}</p>}
      </div>

      {/* Amount + Currency */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-2">{t.debtAmount}</label>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
            style={{ background: '#1E1E38', border: errors.amount ? '1px solid #EF4444' : '1px solid #1E2A40' }}
          />
          {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-slate-400 mb-2">{t.currency}</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="w-full px-3 py-3 rounded-2xl text-slate-100 outline-none"
            style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
          >
            {ALL_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Due date */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">{t.debtDueDate}</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl text-slate-100 outline-none"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', colorScheme: 'dark' }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">{t.debtDescription}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={language === 'ru' ? 'За что, причина...' : 'Reason, notes...'}
          className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
        />
      </div>

      {/* Payment method — only when creating */}
      {!debt && (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              {language === 'ru' ? 'Способ выплаты' : 'Payment method'}
            </label>
            <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#0F0F23' }}>
              <button
                onClick={() => setPaymentType('single')}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active-scale"
                style={{
                  background: paymentType === 'single'
                    ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                    : 'transparent',
                  color: paymentType === 'single' ? 'white' : '#64748B',
                }}
              >
                {language === 'ru' ? '1️⃣ Единоразово' : '1️⃣ One-time'}
              </button>
              <button
                onClick={() => setPaymentType('installment')}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active-scale"
                style={{
                  background: paymentType === 'installment'
                    ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                    : 'transparent',
                  color: paymentType === 'installment' ? 'white' : '#64748B',
                }}
              >
                {language === 'ru' ? '📅 По частям' : '📅 Installments'}
              </button>
            </div>
          </div>

          {/* Installment config block */}
          {paymentType === 'installment' && (
            <div className="space-y-4 p-4 rounded-2xl" style={{ background: '#080818', border: '1px solid #1E2A40' }}>

              {/* Installment amount */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  {language === 'ru' ? 'Сумма одного платежа' : 'Amount per payment'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-2xl text-slate-100 placeholder-slate-600 outline-none"
                  style={{
                    background: '#1E1E38',
                    border: errors.installmentAmount ? '1px solid #EF4444' : '1px solid #1E2A40',
                  }}
                />
                {errors.installmentAmount && (
                  <p className="text-red-400 text-xs mt-1">{errors.installmentAmount}</p>
                )}
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  {language === 'ru' ? 'Периодичность' : 'Frequency'}
                </label>
                <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#1E1E38' }}>
                  {(['weekly', 'monthly', 'yearly'] as RecurringFrequency[]).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setInstallmentFrequency(freq)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active-scale"
                      style={{
                        background: installmentFrequency === freq ? '#3B82F630' : 'transparent',
                        color: installmentFrequency === freq ? '#60A5FA' : '#64748B',
                        border: installmentFrequency === freq ? '1px solid #3B82F650' : '1px solid transparent',
                      }}
                    >
                      {freq === 'weekly'
                        ? language === 'ru' ? 'Каждую неделю' : 'Weekly'
                        : freq === 'monthly'
                        ? language === 'ru' ? 'Каждый месяц' : 'Monthly'
                        : language === 'ru' ? 'Каждый год' : 'Yearly'}
                    </button>
                  ))}
                </div>
              </div>

              {/* First payment date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  {language === 'ru' ? 'Дата первого платежа' : 'First payment date'}
                </label>
                <input
                  type="date"
                  value={installmentStartDate}
                  onChange={(e) => setInstallmentStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-slate-100 outline-none"
                  style={{ background: '#1E1E38', border: '1px solid #1E2A40', colorScheme: 'dark' }}
                />
              </div>

              {/* Source account */}
              {accounts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    {language === 'ru' ? 'Счёт для списания' : 'Debit account'}
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full px-3 py-3 rounded-2xl text-slate-100 outline-none"
                    style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
                  >
                    <option value="">
                      {language === 'ru' ? '— Не указан —' : '— Not specified —'}
                    </option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview */}
              {installmentCount > 0 && (
                <div
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium"
                  style={{ background: '#3B82F610', border: '1px solid #3B82F625', color: '#60A5FA' }}
                >
                  <span>📊</span>
                  <span>
                    {language === 'ru'
                      ? `${installmentCount} платёж${installmentCount === 1 ? '' : installmentCount < 5 ? 'а' : 'ей'} × ${formatAmount(Number(installmentAmount), currency)} — ${freqLabel()}`
                      : `${installmentCount} payment${installmentCount === 1 ? '' : 's'} × ${formatAmount(Number(installmentAmount), currency)} — ${freqLabel()}`}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        className="w-full py-4 rounded-2xl font-semibold text-white text-base active-scale"
        style={{
          background:
            direction === 'lent'
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        }}
      >
        {t.save}
      </button>
    </div>
  );
}
