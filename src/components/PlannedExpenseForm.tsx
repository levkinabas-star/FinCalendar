import { useState } from 'react';
import { format, addMonths } from 'date-fns';
import { useStore } from '../store';
import { translations } from '../translations';
import { Currency, PlannedExpense, RecurringFrequency } from '../types';
import { ChevronDown } from 'lucide-react';
import CategoryPicker from './CategoryPicker';

interface Props {
  expense?: PlannedExpense;
  defaultDate?: string;
  onClose: () => void;
}

export default function PlannedExpenseForm({ expense, defaultDate, onClose }: Props) {
  const { language, accounts, defaultCurrency, addPlannedExpense, updatePlannedExpense } = useStore();
  const t = translations[language];

  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [accountId, setAccountId] = useState(expense?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? '');
  const [startDate, setStartDate] = useState(expense?.startDate ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [recurring, setRecurring] = useState<RecurringFrequency | 'none'>(
    expense?.recurring?.frequency ?? 'none'
  );
  const [endDate, setEndDate] = useState(
    expense?.recurring?.endDate ?? format(addMonths(new Date(), 3), 'yyyy-MM-dd')
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) e.amount = t.amountRequired;
    if (!accountId) e.account = t.accountRequired;
    if (!categoryId) e.category = t.categoryRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const data = {
      accountId,
      amount: parseFloat(amount.replace(',', '.')),
      currency: selectedAccount?.currency ?? (defaultCurrency as Currency),
      categoryId,
      description: description.trim(),
      startDate,
      recurring: recurring !== 'none' ? { frequency: recurring, endDate } : undefined,
    };

    if (expense) {
      updatePlannedExpense(expense.id, data);
    } else {
      addPlannedExpense(data);
    }
    onClose();
  };

  const FREQ_OPTIONS: { value: RecurringFrequency | 'none'; label: string }[] = [
    { value: 'none', label: t.noRepeat },
    { value: 'weekly', label: t.weekly },
    { value: 'monthly', label: t.monthly },
    { value: 'yearly', label: t.yearly },
  ];

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.amount}</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="flex-1 px-4 py-3 text-2xl font-bold"
            style={{
              background: '#1E1E38',
              border: errors.amount ? '1px solid #EF4444' : '1px solid #1E2A40',
              borderRadius: 12,
              color: '#EF4444',
            }}
            autoFocus
          />
          {selectedAccount && (
            <div className="px-3 py-3 rounded-xl text-sm font-semibold text-slate-300"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40', minWidth: 54 }}>
              {selectedAccount.currency}
            </div>
          )}
        </div>
        {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.description}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={language === 'ru' ? 'Название расхода...' : 'Expense name...'}
          className="w-full px-4 py-3"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
        />
      </div>

      {/* Account */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.account}</label>
        <div className="flex gap-2 flex-wrap">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => setAccountId(acc.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm active-scale"
              style={{
                background: accountId === acc.id ? `${acc.color}22` : '#1E1E38',
                border: accountId === acc.id ? `1.5px solid ${acc.color}` : '1.5px solid #1E2A40',
              }}
            >
              <span>{acc.icon}</span>
              <span className="text-slate-200 font-medium">{acc.name}</span>
            </button>
          ))}
        </div>
        {errors.account && <p className="text-red-400 text-xs mt-1">{errors.account}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.category}</label>
        <CategoryPicker
          selectedId={categoryId}
          onChange={(id) => { setCategoryId(id); setErrors((e) => ({ ...e, category: '' })); }}
          type="expense"
          error={errors.category}
        />
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.startDate}</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-4 py-3"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
        />
      </div>

      {/* Recurring */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.recurring}</label>
        <div className="relative">
          <select
            value={recurring}
            onChange={(e) => setRecurring(e.target.value as RecurringFrequency | 'none')}
            className="w-full px-4 py-3 appearance-none pr-10"
            style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
          >
            {FREQ_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* End Date (if recurring) */}
      {recurring !== 'none' && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.recurringEndDate}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="w-full px-4 py-3"
            style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
          />
          <p className="text-xs text-slate-500 mt-1">
            {t.recurring}: {FREQ_OPTIONS.find(f => f.value === recurring)?.label} → {endDate}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
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
          style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
        >
          {t.save}
        </button>
      </div>
    </div>
  );
}
