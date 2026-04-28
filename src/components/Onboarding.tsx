import { useState } from 'react';
import { Check, ChevronRight, Upload } from 'lucide-react';
import { useStore } from '../store';
import { ALL_CURRENCIES, CURRENCY_SYMBOLS, ACCOUNT_COLORS } from '../utils';
import type { Currency } from '../types';
import { importFromCSV } from '../utils/exportImport';
import { useIsDesktop } from '../hooks/useIsDesktop';

const STEPS = 3;

const ACCOUNT_PRESETS = [
  { icon: '💳', nameRu: 'Карта', nameEn: 'Card', color: '#3B82F6' },
  { icon: '💵', nameRu: 'Наличные', nameEn: 'Cash', color: '#10B981' },
  { icon: '🏦', nameRu: 'Сбережения', nameEn: 'Savings', color: '#8B5CF6' },
  { icon: '📱', nameRu: 'Электронный', nameEn: 'E-wallet', color: '#F59E0B' },
];

const TOP_CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR', 'KZT', 'UAH', 'GBP', 'TRY', 'BYN'];

export default function Onboarding() {
  const isDesktop = useIsDesktop();
  const { language, setLanguage, setDefaultCurrency, defaultCurrency, addAccount, setOnboardingCompleted, addTransaction } = useStore();
  const isRu = language === 'ru';

  const [step, setStep] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(defaultCurrency as Currency);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleCurrencyConfirm = () => {
    setDefaultCurrency(selectedCurrency);
    goNext();
  };

  const handleAccountAdd = () => {
    if (selectedPreset === null) return;
    const preset = ACCOUNT_PRESETS[selectedPreset];
    const name = customName.trim() || (isRu ? preset.nameRu : preset.nameEn);
    const balance = parseFloat(initialBalance) || 0;
    addAccount({
      name,
      balance,
      currency: selectedCurrency,
      color: preset.color,
      icon: preset.icon,
    });
    goNext();
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const text = await file.text();
      const state = useStore.getState();
      const result = importFromCSV(text, state.accounts, state.categories, state.defaultCurrency as any);
      if (result.transactions.length > 0) {
        result.transactions.forEach((tx) => addTransaction(tx));
        setImportSuccess(true);
      } else {
        setImportError(isRu ? 'Не удалось распознать транзакции' : 'No transactions recognized');
      }
    } catch {
      setImportError(isRu ? 'Ошибка чтения файла' : 'Error reading file');
    }
    e.target.value = '';
  };

  const handleFinish = () => {
    setOnboardingCompleted();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: '#07070F', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-start', justifyContent: 'center' }}
    >
      <div style={{ width: '100%', maxWidth: 480, paddingBottom: isDesktop ? 40 : 0, display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100%' }}>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-12 pb-6">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              background: i <= step ? '#6366F1' : '#1E1E38',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="px-5" style={{ flex: isDesktop ? 'none' : 1, overflowY: isDesktop ? 'visible' : 'auto' }}>

        {/* Step 0: Language + Currency */}
        {step === 0 && (
          <div className="flex flex-col">
            <div className="mb-8 text-center">
              <div className="text-5xl mb-4">📅</div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">FinCalendar</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                {isRu
                  ? 'Планируйте финансы и контролируйте каждую копейку'
                  : 'Plan your finances and track every penny'}
              </p>
            </div>

            {/* Language */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {isRu ? 'Язык' : 'Language'}
            </p>
            <div className="flex gap-3 mb-6">
              {(['ru', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all active-scale"
                  style={{
                    background: language === lang ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : '#1E1E38',
                    color: language === lang ? 'white' : '#64748B',
                    border: language === lang ? 'none' : '1px solid #2A2A4A',
                  }}
                >
                  {lang === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
                </button>
              ))}
            </div>

            {/* Currency */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {isRu ? 'Основная валюта' : 'Main currency'}
            </p>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {TOP_CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setSelectedCurrency(cur)}
                  className="py-3 rounded-2xl text-center transition-all active-scale"
                  style={{
                    background: selectedCurrency === cur ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : '#1E1E38',
                    border: selectedCurrency === cur ? 'none' : '1px solid #2A2A4A',
                  }}
                >
                  <p className="text-lg font-bold" style={{ color: selectedCurrency === cur ? 'white' : '#94A3B8' }}>
                    {CURRENCY_SYMBOLS[cur]}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: selectedCurrency === cur ? 'rgba(255,255,255,0.7)' : '#475569' }}>
                    {cur}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Add first account */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-slate-100 mb-1">
              {isRu ? 'Добавьте первый счёт' : 'Add your first account'}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {isRu ? 'Выберите тип и укажите текущий баланс' : 'Choose a type and enter your current balance'}
            </p>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {ACCOUNT_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedPreset(i);
                    if (!customName) setCustomName(isRu ? preset.nameRu : preset.nameEn);
                  }}
                  className="rounded-2xl p-4 text-left transition-all active-scale"
                  style={{
                    background: selectedPreset === i
                      ? `linear-gradient(135deg, ${preset.color}30 0%, ${preset.color}15 100%)`
                      : '#1E1E38',
                    border: selectedPreset === i ? `1px solid ${preset.color}60` : '1px solid #2A2A4A',
                  }}
                >
                  <div className="text-2xl mb-2">{preset.icon}</div>
                  <p className="text-sm font-semibold" style={{ color: selectedPreset === i ? '#F1F5F9' : '#64748B' }}>
                    {isRu ? preset.nameRu : preset.nameEn}
                  </p>
                </button>
              ))}
            </div>

            {selectedPreset !== null && (
              <>
                {/* Account name */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {isRu ? 'Название' : 'Name'}
                  </p>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={isRu ? ACCOUNT_PRESETS[selectedPreset].nameRu : ACCOUNT_PRESETS[selectedPreset].nameEn}
                    className="w-full px-4 py-3 rounded-2xl text-slate-100 text-sm outline-none"
                    style={{ background: '#131325', border: '1px solid #1E2A40' }}
                  />
                </div>

                {/* Initial balance */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {isRu ? 'Текущий баланс' : 'Current balance'}
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 pr-16 rounded-2xl text-slate-100 text-sm outline-none"
                      style={{ background: '#131325', border: '1px solid #1E2A40' }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                      {CURRENCY_SYMBOLS[selectedCurrency]}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Import / Done */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg, #6366F130 0%, #4F46E520 100%)', border: '1px solid #6366F130' }}>
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              {isRu ? 'Всё готово!' : "You're all set!"}
            </h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              {isRu
                ? 'Импортируйте историю из банковской выписки или сразу начните вести учёт'
                : 'Import history from a bank statement or start tracking right away'}
            </p>

            {/* CSV Import */}
            <div className="w-full rounded-2xl p-4 mb-4 text-left"
              style={{ background: '#1E1E38', border: '1px solid #2A2A4A' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#6366F120' }}>
                  <Upload size={16} color="#6366F1" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {isRu ? 'Импорт из CSV' : 'Import from CSV'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isRu ? 'Выписка из Тинькофф, Сбера и др.' : 'Tinkoff, Sberbank, etc.'}
                  </p>
                </div>
              </div>
              {importSuccess ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <Check size={14} color="#10B981" />
                  <p className="text-xs text-emerald-400">{isRu ? 'Транзакции импортированы!' : 'Transactions imported!'}</p>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium cursor-pointer active-scale"
                  style={{ background: '#131325', border: '1px dashed #2A2A4A', color: '#64748B' }}>
                  <Upload size={14} />
                  {isRu ? 'Выбрать файл' : 'Choose file'}
                  <input type="file" accept=".csv,.xls,.xlsx" onChange={handleImportCSV} className="hidden" />
                </label>
              )}
              {importError && <p className="text-xs text-red-400 mt-2">{importError}</p>}
            </div>

            <p className="text-xs text-slate-600">
              {isRu ? 'Импорт можно сделать позже в Настройках' : 'You can import later in Settings'}
            </p>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="px-5 pt-4 flex flex-col gap-3" style={{ paddingBottom: isDesktop ? 16 : 32, marginTop: isDesktop ? 0 : 'auto' }}>
        {step === 0 && (
          <button
            onClick={handleCurrencyConfirm}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 active-scale"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
          >
            {isRu ? 'Продолжить' : 'Continue'}
            <ChevronRight size={18} />
          </button>
        )}

        {step === 1 && (
          <>
            <button
              onClick={handleAccountAdd}
              disabled={selectedPreset === null}
              className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 active-scale disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
            >
              {isRu ? 'Добавить счёт' : 'Add Account'}
              <ChevronRight size={18} />
            </button>
            <button
              onClick={goNext}
              className="w-full py-3 rounded-2xl text-sm font-medium text-slate-400 active-scale"
            >
              {isRu ? 'Пропустить' : 'Skip'}
            </button>
          </>
        )}

        {step === 2 && (
          <button
            onClick={handleFinish}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 active-scale"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          >
            {isRu ? 'Начать!' : "Let's go!"}
            <Check size={18} />
          </button>
        )}

        {step > 0 && step < 2 && (
          <button onClick={goPrev} className="text-sm text-slate-500 active-scale text-center">
            {isRu ? '← Назад' : '← Back'}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
