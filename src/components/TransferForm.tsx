import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { formatAmount, CURRENCY_SYMBOLS } from '../utils';
import { Transaction } from '../types';

interface Props {
  onClose: () => void;
  editingTx?: Transaction; // the 'out' side of an existing transfer
}

// Approximate exchange rates relative to RUB (static fallback)
const RATES_TO_RUB: Record<string, number> = {
  RUB: 1, USD: 92, EUR: 100, GBP: 117, KZT: 0.2,
  CNY: 13, UAH: 2.3, BYN: 29, AED: 25, TRY: 2.9,
};

function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const inRub = amount * (RATES_TO_RUB[from] ?? 1);
  return parseFloat((inRub / (RATES_TO_RUB[to] ?? 1)).toFixed(2));
}

export default function TransferForm({ onClose, editingTx }: Props) {
  const { language, accounts, transactions, addTransfer, updateTransfer } = useStore();
  const t = translations[language];

  const isEdit = !!editingTx;
  const peerTx = isEdit && editingTx.transferPeerId
    ? transactions.find((t) => t.id === editingTx.transferPeerId)
    : undefined;

  // strip auto-generated prefixes like "→ Name" / "← Name" to recover user description
  const rawDescription = isEdit
    ? (editingTx.description.startsWith('→') || editingTx.description.startsWith('←') ? '' : editingTx.description)
    : '';

  const [fromId, setFromId] = useState(isEdit ? editingTx.accountId : (accounts[0]?.id ?? ''));
  const [toId, setToId] = useState(isEdit ? (editingTx.transferPeerAccountId ?? accounts[1]?.id ?? '') : (accounts[1]?.id ?? accounts[0]?.id ?? ''));
  const [fromAmount, setFromAmount] = useState(isEdit ? String(editingTx.amount) : '');
  const [toAmount, setToAmount] = useState(isEdit && peerTx ? String(peerTx.amount) : '');
  const [toAmountEdited, setToAmountEdited] = useState(isEdit);
  const [description, setDescription] = useState(rawDescription);
  const [date, setDate] = useState(isEdit ? editingTx.date : format(new Date(), 'yyyy-MM-dd'));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);
  const isSameCurrency = fromAccount?.currency === toAccount?.currency;

  // Auto-convert toAmount when fromAmount changes (unless user edited toAmount manually)
  useEffect(() => {
    if (!fromAmount || toAmountEdited) return;
    if (!fromAccount || !toAccount) return;
    const converted = convert(
      parseFloat(fromAmount.replace(',', '.')) || 0,
      fromAccount.currency,
      toAccount.currency
    );
    setToAmount(converted > 0 ? String(converted) : '');
  }, [fromAmount, fromId, toId, toAmountEdited]);

  // Reset toAmount when accounts change
  useEffect(() => {
    setToAmountEdited(false);
    if (!fromAmount || !fromAccount || !toAccount) return;
    const converted = convert(
      parseFloat(fromAmount.replace(',', '.')) || 0,
      fromAccount.currency,
      toAccount.currency
    );
    setToAmount(converted > 0 ? String(converted) : '');
  }, [fromId, toId]);

  const swapAccounts = () => {
    setFromId(toId);
    setToId(fromId);
    setToAmountEdited(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fromAmount || parseFloat(fromAmount) <= 0) e.amount = t.amountRequired;
    if (!fromId) e.from = t.accountRequired;
    if (!toId) e.to = t.accountRequired;
    if (fromId === toId) e.to = language === 'ru' ? 'Выберите другой счёт' : 'Select a different account';
    if (fromAccount && parseFloat(fromAmount) > fromAccount.balance) {
      e.amount = language === 'ru' ? 'Недостаточно средств' : 'Insufficient funds';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const resolvedToAmount = parseFloat((isSameCurrency ? fromAmount : toAmount).replace(',', '.'));
    if (isEdit && editingTx) {
      updateTransfer(editingTx.id, {
        fromAccountId: fromId,
        toAccountId: toId,
        fromAmount: parseFloat(fromAmount.replace(',', '.')),
        toAmount: resolvedToAmount,
        description: description.trim(),
        date,
      });
    } else {
      addTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        fromAmount: parseFloat(fromAmount.replace(',', '.')),
        toAmount: resolvedToAmount,
        description: description.trim(),
        date,
      });
    }
    onClose();
  };

  if (accounts.length < 2) {
    return (
      <div className="px-5 pb-8 flex flex-col items-center justify-center py-10 text-center">
        <div className="text-5xl mb-4">💳</div>
        <p className="text-slate-300 font-semibold mb-2">
          {language === 'ru' ? 'Нужно минимум 2 счёта' : 'Need at least 2 accounts'}
        </p>
        <p className="text-slate-500 text-sm">
          {language === 'ru'
            ? 'Создайте ещё один счёт во вкладке «Счета»'
            : 'Create another account in the Accounts tab'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* From → To visual */}
      <div className="flex items-center gap-3">
        {/* From */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            {language === 'ru' ? 'Откуда' : 'From'}
          </label>
          <div className="flex flex-col gap-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setFromId(acc.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm active-scale"
                style={{
                  background: fromId === acc.id ? `${acc.color}22` : '#1E1E38',
                  border: fromId === acc.id ? `1.5px solid ${acc.color}` : '1.5px solid #1E2A40',
                }}
              >
                <span>{acc.icon}</span>
                <div className="text-left">
                  <p className="text-slate-200 font-medium text-xs leading-tight">{acc.name}</p>
                  <p className="text-slate-500 text-[10px]">{formatAmount(acc.balance, acc.currency)}</p>
                </div>
              </button>
            ))}
          </div>
          {errors.from && <p className="text-red-400 text-xs mt-1">{errors.from}</p>}
        </div>

        {/* Swap button */}
        <div className="flex flex-col items-center gap-2 pt-5">
          <button
            onClick={swapAccounts}
            className="w-9 h-9 rounded-xl flex items-center justify-center active-scale"
            style={{ background: '#1E2A40' }}
          >
            <ArrowRight size={16} className="text-blue-400" />
          </button>
        </div>

        {/* To */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            {language === 'ru' ? 'Куда' : 'To'}
          </label>
          <div className="flex flex-col gap-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setToId(acc.id)}
                disabled={acc.id === fromId}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm active-scale disabled:opacity-30"
                style={{
                  background: toId === acc.id ? `${acc.color}22` : '#1E1E38',
                  border: toId === acc.id ? `1.5px solid ${acc.color}` : '1.5px solid #1E2A40',
                }}
              >
                <span>{acc.icon}</span>
                <div className="text-left">
                  <p className="text-slate-200 font-medium text-xs leading-tight">{acc.name}</p>
                  <p className="text-slate-500 text-[10px]">{formatAmount(acc.balance, acc.currency)}</p>
                </div>
              </button>
            ))}
          </div>
          {errors.to && <p className="text-red-400 text-xs mt-1">{errors.to}</p>}
        </div>
      </div>

      {/* Transfer preview card */}
      {fromAccount && toAccount && fromId !== toId && (
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: '#131325', border: '1px solid #1E2A40' }}
        >
          <div className="text-center flex-1">
            <p className="text-xl">{fromAccount.icon}</p>
            <p className="text-xs text-slate-400 mt-0.5">{fromAccount.name}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <div className="w-8 h-px" style={{ background: '#3B82F6' }} />
              <ArrowRight size={14} color="#3B82F6" />
            </div>
            {!isSameCurrency && (
              <div className="flex items-center gap-1 text-[10px] text-blue-400">
                <RefreshCw size={10} />
                <span>{fromAccount.currency} → {toAccount.currency}</span>
              </div>
            )}
          </div>
          <div className="text-center flex-1">
            <p className="text-xl">{toAccount.icon}</p>
            <p className="text-xs text-slate-400 mt-0.5">{toAccount.name}</p>
          </div>
        </div>
      )}

      {/* Amount row */}
      <div className={`grid gap-3 ${isSameCurrency ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            {language === 'ru' ? 'Сумма перевода' : 'Transfer amount'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => { setFromAmount(e.target.value); setToAmountEdited(false); }}
              placeholder="0"
              className="w-full px-4 py-3 pr-14 text-xl font-bold"
              style={{
                background: '#1E1E38',
                border: errors.amount ? '1px solid #EF4444' : '1px solid #1E2A40',
                borderRadius: 12,
                color: '#EF4444',
              }}
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              {fromAccount ? CURRENCY_SYMBOLS[fromAccount.currency] : ''}
            </span>
          </div>
          {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
        </div>

        {/* To amount — only if different currencies */}
        {!isSameCurrency && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              {language === 'ru' ? 'Сумма зачисления' : 'Credit amount'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={toAmount}
                onChange={(e) => { setToAmount(e.target.value); setToAmountEdited(true); }}
                placeholder="0"
                className="w-full px-4 py-3 pr-14 text-xl font-bold"
                style={{
                  background: '#1E1E38',
                  border: '1px solid #1E2A40',
                  borderRadius: 12,
                  color: '#10B981',
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {toAccount ? CURRENCY_SYMBOLS[toAccount.currency] : ''}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {language === 'ru' ? 'Можно изменить вручную' : 'Can be edited manually'}
            </p>
          </div>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.date}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
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
          {isEdit ? t.save : (language === 'ru' ? 'Перевести' : 'Transfer')}
        </button>
      </div>
    </div>
  );
}
