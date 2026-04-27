import { useState, lazy, Suspense, useMemo, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import DesktopSidebar from './components/DesktopSidebar';
import Modal from './components/Modal';
import TransactionForm from './components/TransactionForm';
import TransferForm from './components/TransferForm';
import DebtForm from './components/DebtForm';
import InstallPrompt from './components/InstallPrompt';
import Onboarding from './components/Onboarding';
import ToastContainer from './components/Toast';
import { useSmartNotifications } from './hooks/useSmartNotifications';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { useIsDesktop } from './hooks/useIsDesktop';
import { useStore } from './store';
import { translations } from './translations';
import { WidgetData } from './widgetPlugin';
import { getDatesWithEventsInMonth, getDebtPaymentsInMonth, getScheduledPaymentsInMonth, getDebtsWithDueDateInMonth } from './utils';
import { ArrowLeftRight, TrendingUp, TrendingDown, Coins, Receipt } from 'lucide-react';
import { AddTransactionContext } from './contexts/AddTransactionContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Settings = lazy(() => import('./pages/Settings'));
const Widgets = lazy(() => import('./pages/Widgets'));
const Pricing = lazy(() => import('./pages/Pricing'));
const UserAgreement = lazy(() => import('./pages/UserAgreement'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn'));
const Seed = lazy(() => import('./pages/Seed'));
const ScreenshotFrame = lazy(() => import('./pages/ScreenshotFrame'));

type AddMode = 'expense' | 'income' | 'transfer';
type EntityType = 'transaction' | 'debt';

export default function App() {
  const [showAdd, setShowAdd] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>('transaction');
  const [addMode, setAddMode] = useState<AddMode>('expense');
  const [initialDate, setInitialDate] = useState<string | undefined>();
  const language = useStore((s) => s.language);
  const t = translations[language];
  const onboardingCompleted = useStore((s) => s.onboardingCompleted);
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const defaultCurrency = useStore((s) => s.defaultCurrency);
  const plannedExpenses = useStore((s) => s.plannedExpenses);
  const debts = useStore((s) => s.debts);
  const isDesktop = useIsDesktop();

  // Sync balance + all event dates to Android widget SharedPreferences (debounced 1s)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0).toFixed(0);
        const currencySymbol: Record<string, string> = {
          RUB: '₽', USD: '$', EUR: '€', GBP: '£', KZT: '₸', CNY: '¥', UAH: '₴', BYN: 'Br', AED: 'د.إ', TRY: '₺',
        };
        const txDates = [...new Set(transactions.map((t) => t.date))].join(',');

        const pendingSet = new Set<string>();
        const completedSet = new Set<string>();
        const debtSet = new Set<string>();
        const now = new Date();

        for (let mo = -6; mo <= 6; mo++) {
          const d = new Date(now.getFullYear(), now.getMonth() + mo, 1);
          const yr = d.getFullYear();
          const mo2 = d.getMonth();

          const evMap = getDatesWithEventsInMonth(plannedExpenses, yr, mo2);
          for (const [ds, ev] of Object.entries(evMap)) {
            if (ev.pending > 0) pendingSet.add(ds);
            if (ev.completed > 0) completedSet.add(ds);
          }
          for (const ds of Object.keys(getDebtPaymentsInMonth(debts, yr, mo2))) debtSet.add(ds);
          for (const ds of Object.keys(getScheduledPaymentsInMonth(debts, yr, mo2))) debtSet.add(ds);
          for (const ds of Object.keys(getDebtsWithDueDateInMonth(debts, yr, mo2))) debtSet.add(ds);
        }

        WidgetData.updateData({
          totalBalance,
          currency: currencySymbol[defaultCurrency] ?? defaultCurrency,
          txDates,
          pendingDates:   [...pendingSet].join(','),
          completedDates: [...completedSet].join(','),
          debtDates:      [...debtSet].join(','),
        }).catch(() => {});
      } catch { /* non-Android or data error — skip widget update */ }
    }, 1000);

    return () => clearTimeout(timer);
  }, [accounts, transactions, defaultCurrency, plannedExpenses, debts]);

  const openAdd = useCallback((mode: AddMode = 'expense', date?: string) => {
    setEntityType('transaction');
    setAddMode(mode);
    setInitialDate(date);
    setShowAdd(true);
  }, []);

  const TABS = useMemo<{ mode: AddMode; label: string; icon: React.ReactNode; color: string }[]>(() => [
    { mode: 'expense',  label: t.addExpense,                                icon: <TrendingDown size={14} />,   color: '#EF4444' },
    { mode: 'income',   label: t.addIncome,                                 icon: <TrendingUp size={14} />,     color: '#10B981' },
    { mode: 'transfer', label: language === 'ru' ? 'Перевод' : 'Transfer',  icon: <ArrowLeftRight size={14} />, color: '#3B82F6' },
  ], [language, t]);

  const ENTITY_TABS = useMemo<{ type: EntityType; label: string; icon: React.ReactNode }[]>(() => [
    { type: 'transaction', label: language === 'ru' ? 'Операция' : 'Transaction', icon: <Receipt size={14} /> },
    { type: 'debt',        label: language === 'ru' ? 'Долг'     : 'Debt',        icon: <Coins size={14} />   },
  ], [language]);

  const { toasts, dismissToast } = useSmartNotifications();
  useSupabaseSync();

  if (!onboardingCompleted) {
    return <Onboarding />;
  }

  const routes = (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/statistics" element={<Statistics />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/widgets" element={<Widgets />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/legal" element={<UserAgreement />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/payment-return" element={<PaymentReturn />} />
      <Route path="/seed" element={<Seed />} />
      <Route path="/screenshot-frame" element={<ScreenshotFrame />} />
    </Routes>
  );

  const modalContent = (
    <Modal
      isOpen={showAdd}
      onClose={() => setShowAdd(false)}
      title=" "
      fullHeight
    >
      {/* Entity type selector */}
      <div className="px-5 -mt-2 mb-3">
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#0A0A1C' }}>
          {ENTITY_TABS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setEntityType(tab.type)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all active-scale"
              style={{
                background: entityType === tab.type
                  ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                  : 'transparent',
                color: entityType === tab.type ? 'white' : '#64748B',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {entityType === 'debt' ? (
        <DebtForm onClose={() => setShowAdd(false)} />
      ) : (
        <>
          <div className="px-5 mb-4">
            <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#131325' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.mode}
                  onClick={() => setAddMode(tab.mode)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all active-scale"
                  style={{
                    background: addMode === tab.mode ? tab.color : 'transparent',
                    color: addMode === tab.mode ? 'white' : '#64748B',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {addMode === 'transfer' ? (
            <TransferForm onClose={() => setShowAdd(false)} />
          ) : (
            <TransactionForm
              key={addMode + (initialDate ?? '')}
              initialType={addMode as 'income' | 'expense'}
              initialDate={initialDate}
              onClose={() => setShowAdd(false)}
            />
          )}
        </>
      )}
    </Modal>
  );

  return (
    <BrowserRouter>
      <AddTransactionContext.Provider value={{ openAdd }}>
        <WidgetActionHandler openAdd={openAdd} />
        <InstallPrompt />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {isDesktop ? (
          /* ── Desktop Layout ── */
          <div
            style={{
              display: 'flex',
              minHeight: '100vh',
              background: '#07070F',
            }}
          >
            <DesktopSidebar onAddTransaction={() => openAdd('expense')} />
            <main
              style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '100vh',
                background: '#07070F',
              }}
            >
              <div
                style={{
                  maxWidth: 720,
                  margin: '0 auto',
                  padding: '0 8px',
                }}
              >
                <Suspense fallback={<div style={{ height: '100vh', background: '#07070F' }} />}>
                  {routes}
                </Suspense>
              </div>
            </main>
          </div>
        ) : (
          /* ── Mobile Layout ── */
          <div className="min-h-screen" style={{ background: '#07070F' }}>
            <Suspense fallback={<div style={{ height: '100vh', background: '#07070F' }} />}>
              {routes}
            </Suspense>
            <BottomNav onAddTransaction={() => openAdd('expense')} />
          </div>
        )}

        {modalContent}
      </AddTransactionContext.Provider>
    </BrowserRouter>
  );
}

function WidgetActionHandler({ openAdd }: { openAdd: (mode: 'expense' | 'income' | 'transfer') => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = (action: string) => {
      if (action === 'addExpense')        openAdd('expense');
      else if (action === 'addIncome')    openAdd('income');
      else if (action === 'openCalendar') navigate('/calendar');
    };

    WidgetData.getPendingAction().then(({ action }) => { if (action) handle(action); }).catch(() => {});

    const onWidgetAction = (e: Event) => {
      const action = (e as CustomEvent<{ action: string }>).detail?.action;
      if (action) handle(action);
    };
    window.addEventListener('widgetAction', onWidgetAction);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        WidgetData.getPendingAction().then(({ action }) => { if (action) handle(action); }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('widgetAction', onWidgetAction);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [openAdd, navigate]);

  return null;
}
