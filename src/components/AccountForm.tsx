import { useState } from 'react';
import { useStore } from '../store';
import { translations } from '../translations';
import { Account, Currency } from '../types';
import { ACCOUNT_COLORS, ACCOUNT_ICONS, ALL_CURRENCIES, CURRENCY_SYMBOLS } from '../utils';
import { Check } from 'lucide-react';

interface Props {
  account?: Account;
  onClose: () => void;
}

export default function AccountForm({ account, onClose }: Props) {
  const { language, addAccount, updateAccount } = useStore();
  const t = translations[language];

  const [name, setName] = useState(account?.name ?? '');
  const [balance, setBalance] = useState(account ? String(account.balance) : '');
  const [currency, setCurrency] = useState<Currency>(account?.currency ?? 'RUB');
  const [color, setColor] = useState(account?.color ?? ACCOUNT_COLORS[0]);
  const [icon, setIcon] = useState(account?.icon ?? '💰');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError(t.nameRequired); return; }
    const bal = parseFloat(balance.replace(',', '.')) || 0;

    if (account) {
      updateAccount(account.id, { name: name.trim(), balance: bal, currency, color, icon });
    } else {
      addAccount({ name: name.trim(), balance: bal, currency, color, icon });
    }
    onClose();
  };

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Preview Card */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
          border: `1px solid ${color}33`,
        }}
      >
        <span className="text-3xl">{icon}</span>
        <div>
          <div className="font-semibold text-slate-100">{name || 'Название счёта'}</div>
          <div className="text-sm text-slate-400">
            {parseFloat(balance || '0').toLocaleString('ru-RU')} {CURRENCY_SYMBOLS[currency]}
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.accountName}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          placeholder={t.accountName}
          className="w-full px-4 py-3"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      {/* Balance */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.initialBalance}</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
            className="flex-1 px-4 py-3"
            style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="px-3 py-3"
            style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }}
          >
            {ALL_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Icon */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">{t.icon}</label>
        <div className="grid grid-cols-8 gap-2">
          {ACCOUNT_ICONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl active-scale transition-all"
              style={{
                background: icon === ic ? `${color}33` : '#1E1E38',
                border: icon === ic ? `2px solid ${color}` : '2px solid transparent',
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">{t.color}</label>
        <div className="flex flex-wrap gap-3">
          {ACCOUNT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-9 h-9 rounded-xl active-scale transition-all flex items-center justify-center"
              style={{ background: c, border: color === c ? '3px solid white' : '3px solid transparent' }}
            >
              {color === c && <Check size={14} color="white" strokeWidth={3} />}
            </button>
          ))}
        </div>
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
          {t.save}
        </button>
      </div>
    </div>
  );
}
