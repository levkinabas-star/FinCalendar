import { useState } from 'react';
import { format, addMonths } from 'date-fns';
import { Repeat, Crown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { translations } from '../translations';
import { Currency, Transaction, TransactionType, RecurringFrequency } from '../types';
import CategoryPicker from './CategoryPicker';
import { usePlan, FREE_LIMITS } from '../plan';

interface Props {
  onClose: () => void;
  initialType?: TransactionType;
  initialDate?: string;
  editingTx?: Transaction;
}

export default function TransactionForm({ onClose, initialType = 'expense', initialDate, editingTx }: Props) {
  const { language, accounts, defaultCurrency, addTransaction, updateTransaction, addPlannedExpense } = useStore();
  const t = translations[language];
  const { canAddTransaction, isPro, transactionsUsed } = usePlan();
  const navigate = useNavigate();
  const isRu = language === 'ru';

  const isEdit = !!editingTx;

  const [type, setType] = useState<TransactionType>(editingTx?.type ?? initialType);
  const [amount, setAmount] = useState(editingTx ? String(editingTx.amount) : '');
  const [accountId, setAccountId] = useState(editingTx?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(editingTx?.categoryId ?? '');
  const [description, setDescription] = useState(editingTx?.description ?? '');
  const [date, setDate] = useState(editingTx?.date ?? initialDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  // Recurring state — only for new expense/income
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState<RecurringFrequency>('monthly');
  const [recurEndDate, setRecurEndDate] = useState(format(addMonths(new Date(), 12), 'yyyy-MM-dd'));

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isExpenseOrIncome = type === 'expense' || type === 'income';
  const showRecurring = !isEdit && isExpenseOrIncome;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) e.amount = t.amountRequired;
    if (!accountId) e.account = t.accountRequired;
    if (!categoryId) e.category = t.categoryRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!isEdit && !canAddTransaction) { navigate('/pricing'); onClose(); return; }
    if (!validate()) return;
    const parsed = parseFloat(amount.replace(',', '.'));
    const currency = selectedAccount?.currency ?? (defaultCurrency as Currency);

    if (isEdit && editingTx) {
      updateTransaction(editingTx.id, {
        accountId,
        type: type as 'income' | 'expense',
        amount: parsed,
        currency,
        categoryId,
        description: description.trim(),
        date,
      });
    } else if (isRecurring && isExpenseOrIncome) {
      // Create a planned (recurring) expense/income
      addPlannedExpense({
        accountId,
        type: type as 'income' | 'expense',
        amount: parsed,
        currency,
        categoryId,
        description: description.trim(),
        startDate: date,
        recurring: { frequency: recurFrequency, endDate: recurEndDate },
      });
    } else {
      addTransaction({
        accountId,
        type,
        amount: parsed,
        currency,
        categoryId,
        description: description.trim(),
        date,
      });
    }
    // Show success feedback before closing
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
    { value: 'weekly',  label: language === 'ru' ? 'Нед.'  : 'Weekly'  },
    { value: 'monthly', label: language === 'ru' ? 'Мес.'  : 'Monthly' },
    { value: 'yearly',  label: language === 'ru' ? 'Год'   : 'Yearly'  },
  ];

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Success overlay */}
      {saved && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl z-10"
          style={{ background: '#0E0E1C', animation: 'fadeIn 0.2s ease-out' }}
          aria-live="polite"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.2)', animation: 'slideUp 0.3s ease-out' }}
          >
            <Check size={40} color="#10B981" strokeWidth={3} />
          </div>
          <p className="mt-4 text-base font-semibold" style={{ color: '#10B981' }}>
            {isRu ? 'Сохранено!' : 'Saved!'}
          </p>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.amount}</label>
        <div className="flex gap-2 items-center">
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
              color: type === 'income' ? '#10B981' : '#EF4444',
            }}
            autoFocus
          />
          {selectedAccount && (
            <div
              className="px-3 py-3 rounded-xl text-sm font-semibold text-slate-300"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40', minWidth: 54 }}
            >
              {selectedAccount.currency}
            </div>
          )}
        </div>
        {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
      </div>

      {/* Account */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.account}</label>
        <div className="flex gap-2 flex-wrap">
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
            </button>
          ))}
        </div>
        {errors.account && <p className="text-red-400 text-xs mt-1">{errors.account}</p>}
        {accounts.length === 0 && <p className="text-slate-500 text-sm">{t.noAccounts}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.category}</label>
        <CategoryPicker
          selectedId={categoryId}
          onChange={(id) => { setCategoryId(id); setErrors((e) => ({ ...e, category: '' })); }}
          type={type as 'income' | 'expense'}
          error={errors.category}
        />
      </div>

      {/* Date / Start date */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
          {isRecurring ? (language === 'ru' ? 'Дата начала' : 'Start date') : t.date}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9', colorScheme: 'dark' }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.description}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={language === 'ru' ? 'Необязательно...' : 'Optional...'}
          className="w-full px-4 py-3"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
        />
      </div>

      {/* Recurring toggle — only for new expense/income */}
      {showRecurring && (
        <div>
          <button
            onClick={() => setIsRecurring((v) => !v)}
            className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl transition-all active-scale"
            style={{
              background: isRecurring ? '#6366F115' : '#1E1E38',
              border: isRecurring ? '1px solid #6366F140' : '1px solid #1E2A40',
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isRecurring ? '#6366F130' : '#0F0F23' }}
            >
              <Repeat size={16} color={isRecurring ? '#818CF8' : '#475569'} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: isRecurring ? '#C7D2FE' : '#94A3B8' }}>
                {language === 'ru' ? 'Повторяющийся платёж' : 'Recurring payment'}
              </p>
              {!isRecurring && (
                <p className="text-xs text-slate-600">
                  {language === 'ru' ? 'Нажмите чтобы настроить' : 'Tap to configure'}
                </p>
              )}
            </div>
            {/* Toggle indicator */}
            <div
              className="w-11 h-6 rounded-full flex-shrink-0 transition-all relative"
              style={{ background: isRecurring ? '#6366F1' : '#1E2A40' }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: isRecurring ? 24 : 4 }}
              />
            </div>
          </button>

          {/* Recurring options */}
          {isRecurring && (
            <div className="mt-3 space-y-3 p-4 rounded-2xl" style={{ background: '#080818', border: '1px solid #1E2A40' }}>
              {/* Frequency */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  {language === 'ru' ? 'Периодичность' : 'Frequency'}
                </label>
                <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#1E1E38' }}>
                  {FREQ_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRecurFrequency(opt.value)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active-scale"
                      style={{
                        background: recurFrequency === opt.value ? '#6366F130' : 'transparent',
                        color: recurFrequency === opt.value ? '#818CF8' : '#64748B',
                        border: recurFrequency === opt.value ? '1px solid #6366F140' : '1px solid transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* End date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  {t.recurringEndDate}
                </label>
                <input
                  type="date"
                  value={recurEndDate}
                  onChange={(e) => setRecurEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-slate-100 outline-none"
                  style={{ background: '#1E1E38', border: '1px solid #1E2A40', colorScheme: 'dark' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Free plan limit warning */}
      {!isEdit && !isPro && !canAddTransaction && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: '#1A1A30', border: '1px solid #2D2D5A' }}>
          <Crown size={16} color="#F59E0B" />
          <p className="text-slate-400 text-sm flex-1">
            {isRu
              ? `Лимит ${FREE_LIMITS.transactions} транзакций достигнут. Перейдите на Pro.`
              : `Limit of ${FREE_LIMITS.transactions} transactions reached. Upgrade to Pro.`}
          </p>
          <button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl active-scale"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', color: 'white' }}
          >Pro</button>
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
          style={{
            background: isRecurring
              ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
              : type === 'income'
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          }}
        >
          {isRecurring
            ? (language === 'ru' ? 'Создать шаблон' : 'Create template')
            : t.save}
        </button>
      </div>
    </div>
  );
}
