import { useState } from 'react';
import { Globe, DollarSign, Tag, Trash2, ChevronRight, Plus, X, ArrowLeftRight, LayoutGrid, Crown, MessageCircle, FileText, Shield, Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { translations } from '../translations';
import { usePlan, FREE_LIMITS } from '../plan';
import { ALL_CURRENCIES, CURRENCY_NAMES } from '../utils';
import { Currency, Language } from '../types';
import Modal from '../components/Modal';
import ImportExportModal from '../components/ImportExportModal';
import FeedbackModal from '../components/FeedbackModal';
import { useSmartNotifications } from '../hooks/useSmartNotifications';

export default function Settings() {
  const navigate = useNavigate();
  const { language, defaultCurrency, categories, setLanguage, setDefaultCurrency, addCategory, deleteCategory, clearAllData } = useStore();
  const t = translations[language];
  const { canAddCustomCategory, isPro, plan, proExpiry, appliedPromoCode, customCategoriesUsed } = usePlan();

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [newCatType, setNewCatType] = useState<'income' | 'expense' | 'both'>('expense');
  const [newCatColor, setNewCatColor] = useState('#94A3B8');

  const { notificationsEnabled, enableNotifications, disableNotifications } = useSmartNotifications();
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifDenied, setNotifDenied] = useState(false);
  const customCategories = categories.filter((c) => !c.isPreset);

  const ICONS = ['🏷️', '🎮', '🎵', '🐾', '🌿', '🚀', '💆', '🏋️', '🎨', '🍷', '🌍', '🔧', '🎯', '💡', '📦', '🛠️'];
  const COLORS = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4','#F97316','#6366F1','#84CC16','#A855F7','#94A3B8'];

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      nameEn: newCatNameEn.trim() || newCatName.trim(),
      icon: newCatIcon,
      type: newCatType,
      color: newCatColor,
    });
    setNewCatName('');
    setNewCatNameEn('');
    setNewCatIcon('🏷️');
  };

  return (
    <div className="page-enter pb-32">
      <div className="px-5 pt-6 pb-5">
        <h1 className="text-2xl font-bold text-slate-100">{t.settings}</h1>
      </div>

      {/* Pro plan banner */}
      <div className="mx-5 mb-5">
        {isPro ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-4 py-4 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #0d1a2e 0%, #1a0a2e 100%)', border: '1px solid #2D2D5A' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}>
                <Crown size={16} color="white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{language === 'ru' ? 'Pro активен' : 'Pro Active'}</p>
                <p className="text-xs text-slate-400">
                  {proExpiry === null
                    ? (language === 'ru' ? 'Навсегда' : 'Lifetime')
                    : (language === 'ru'
                        ? `До ${new Date(proExpiry).toLocaleDateString('ru-RU')}`
                        : `Until ${new Date(proExpiry).toLocaleDateString('en-US')}`)}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>PRO</span>
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active-scale"
              style={{ background: '#12122A', border: '1px solid #1E2A40' }}
            >
              <Tag size={15} color="#3B82F6" />
              <span className="text-sm text-slate-300 flex-1 text-left">
                {language === 'ru' ? 'Ввести промокод' : 'Enter promo code'}
              </span>
              <ChevronRight size={16} className="text-slate-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/pricing')}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl active-scale"
            style={{ background: 'linear-gradient(135deg, #0d1a2e 0%, #1a0a2e 100%)', border: '1px solid #2D2D5A' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}>
              <Crown size={16} color="white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-white">{language === 'ru' ? 'Перейти на Pro' : 'Upgrade to Pro'}</p>
              <p className="text-xs text-slate-400">{language === 'ru' ? 'Статистика, бюджеты, долги, экспорт и многое другое' : 'Statistics, budgets, debts, exports & more'}</p>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </button>
        )}
      </div>

      {/* Widgets */}
      <Section title={language === 'ru' ? 'Виджеты' : 'Widgets'} icon={<LayoutGrid size={16} />}>
        <button
          onClick={() => navigate('/widgets')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl active-scale"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
        >
          <span className="flex items-center gap-2 text-slate-200 font-medium">
            {language === 'ru' ? 'Просмотр виджетов' : 'View widgets'}
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#312E81', color: '#A5B4FC' }}>BETA</span>
          </span>
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </Section>

      {/* Notifications */}
      <Section
        title={
          <span className="flex items-center gap-2">
            {language === 'ru' ? 'Уведомления' : 'Notifications'}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#312E81', color: '#A5B4FC' }}>BETA</span>
          </span>
        }
        icon={<Bell size={16} />}
      >
        <button
          disabled={notifLoading}
          onClick={async () => {
            setNotifDenied(false);
            if (notificationsEnabled) {
              disableNotifications();
              return;
            }
            setNotifLoading(true);
            const granted = await enableNotifications();
            setNotifLoading(false);
            if (!granted) setNotifDenied(true);
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl active-scale"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40', opacity: notifLoading ? 0.6 : 1 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: notificationsEnabled ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.15)' }}>
              {notificationsEnabled ? <Bell size={15} color="#6366F1" /> : <BellOff size={15} color="#64748B" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200">
                {language === 'ru' ? 'Умные уведомления' : 'Smart notifications'}
              </p>
              <p className="text-xs text-slate-500">
                {notifLoading
                  ? (language === 'ru' ? 'Запрос разрешения...' : 'Requesting permission...')
                  : notificationsEnabled
                    ? (language === 'ru' ? 'Включены' : 'Enabled')
                    : (language === 'ru' ? 'Нажмите, чтобы включить' : 'Tap to enable')}
              </p>
            </div>
          </div>
          <div
            className="w-10 h-6 rounded-full transition-all duration-200 relative"
            style={{ background: notificationsEnabled ? '#6366F1' : '#1E2A40' }}
          >
            <div
              className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
              style={{ left: notificationsEnabled ? 22 : 4 }}
            />
          </div>
        </button>
        {notifDenied && (
          <p className="text-xs px-1 mt-2" style={{ color: '#F87171' }}>
            {language === 'ru'
              ? 'Браузер заблокировал уведомления. Разрешите их в настройках браузера (значок 🔒 в адресной строке).'
              : 'Browser blocked notifications. Allow them in browser settings (🔒 icon in address bar).'}
          </p>
        )}
        <p className="text-xs text-slate-600 px-1 mt-2">
          {language === 'ru'
            ? 'Напоминания о платежах, долгах и превышении бюджета'
            : 'Reminders for payments, debts, and budget alerts'}
        </p>
      </Section>

      {/* Language */}
      <Section title={t.language} icon={<Globe size={16} />}>
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#131325' }}>
          {(['ru', 'en'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active-scale"
              style={{
                background: language === lang ? '#3B82F6' : 'transparent',
                color: language === lang ? 'white' : '#64748B',
              }}
            >
              {lang === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </Section>

      {/* Currency */}
      <Section title={t.defaultCurrency} icon={<DollarSign size={16} />}>
        <button
          onClick={() => setShowCurrencyModal(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl active-scale"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
        >
          <span className="text-slate-200 font-medium">
            {defaultCurrency} — {CURRENCY_NAMES[defaultCurrency as Currency][language]}
          </span>
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </Section>

      {/* Custom Categories */}
      <Section title={t.customCategories} icon={<Tag size={16} />}>
        {/* Existing custom */}
        {customCategories.length > 0 && (
          <div className="mb-3 space-y-2">
            {customCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{cat.name}</p>
                  <p className="text-xs text-slate-500">{cat.type === 'income' ? t.income : cat.type === 'expense' ? t.expenses : 'both'}</p>
                </div>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <button onClick={() => deleteCategory(cat.id)} className="w-7 h-7 rounded-lg flex items-center justify-center active-scale" style={{ background: '#131325' }}>
                  <Trash2 size={12} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        <button
          onClick={() => canAddCustomCategory ? setShowCategoryModal(true) : navigate('/pricing')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl active-scale"
          style={{ background: 'transparent', border: '2px dashed #1E2A40' }}
        >
          {canAddCustomCategory ? <Plus size={16} className="text-slate-500" /> : <Crown size={16} color="#F59E0B" />}
          <span className="text-slate-500 text-sm">
            {canAddCustomCategory
              ? t.addCategory
              : (language === 'ru'
                ? `Лимит: ${FREE_LIMITS.customCategories} категорий — перейти на Pro`
                : `Limit: ${FREE_LIMITS.customCategories} categories — upgrade to Pro`)}
          </span>
        </button>
      </Section>

      {/* Import / Export */}
      <Section title={language === 'ru' ? 'Данные' : 'Data'} icon={<ArrowLeftRight size={16} />}>
        <button
          onClick={() => setShowImportExport(true)}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl active-scale"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <ArrowLeftRight size={16} color="#3B82F6" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-slate-200">
              {language === 'ru' ? 'Импорт / Экспорт' : 'Import / Export'}
            </p>
            <p className="text-xs text-slate-500">
              {language === 'ru' ? 'PDF, Excel, CSV, JSON резервная копия' : 'PDF, Excel, CSV, JSON backup'}
            </p>
          </div>
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </Section>

      {/* Feedback */}
      <Section title={t.feedbackContact} icon={<MessageCircle size={16} />}>
        <button
          onClick={() => setShowFeedback(true)}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl active-scale"
          style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <MessageCircle size={16} color="#6366F1" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-slate-200">{t.feedbackContact}</p>
            <p className="text-xs text-slate-500">{t.feedbackContactDesc}</p>
          </div>
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </Section>

      {/* Danger Zone */}
      <div className="mx-5 mb-5">
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2D1B1B' }}>
          <div className="px-4 py-2" style={{ background: '#1A0F0F' }}>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Danger Zone</p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-4 active-scale"
            style={{ background: '#0E0E1C' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <Trash2 size={16} color="#EF4444" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-red-400">{t.clearData}</p>
              <p className="text-xs text-slate-500">{language === 'ru' ? 'Удалить все счета, транзакции и планы' : 'Delete all accounts, transactions and plans'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Legal */}
      <Section title={language === 'ru' ? 'Правовая информация' : 'Legal'} icon={<Shield size={16} />}>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2A40' }}>
          <button
            onClick={() => navigate('/legal')}
            className="w-full flex items-center gap-3 px-4 py-4 active-scale"
            style={{ background: '#1E1E38', borderBottom: '1px solid #1E2A40' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <FileText size={16} color="#6366F1" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-slate-200">
                {language === 'ru' ? 'Пользовательское соглашение' : 'Terms of Service'}
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </button>
          <button
            onClick={() => navigate('/privacy')}
            className="w-full flex items-center gap-3 px-4 py-4 active-scale"
            style={{ background: '#1E1E38' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <Shield size={16} color="#10B981" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-slate-200">
                {language === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy'}
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </button>
        </div>
      </Section>

      {/* About */}
      <div className="mx-5 mb-5 px-4 py-4 rounded-2xl text-center" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
        <div className="text-3xl mb-2">💰</div>
        <p className="text-sm font-semibold text-slate-200">FinCalendar</p>
        <p className="text-xs text-slate-500 mt-0.5">{t.version}</p>
        <p className="text-xs text-slate-600 mt-1.5">
          © 2026 FinCalendar. {language === 'ru' ? 'Все права защищены.' : 'All rights reserved.'}
        </p>
      </div>

      {/* Currency Modal */}
      <Modal isOpen={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} title={t.defaultCurrency} fullHeight>
        <div className="px-5 pb-8 space-y-2">
          {ALL_CURRENCIES.map((cur) => (
            <button
              key={cur}
              onClick={() => { setDefaultCurrency(cur); setShowCurrencyModal(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active-scale"
              style={{
                background: defaultCurrency === cur ? 'rgba(59,130,246,0.15)' : '#1E1E38',
                border: defaultCurrency === cur ? '1.5px solid #3B82F6' : '1.5px solid #1E2A40',
              }}
            >
              <span className="text-lg font-bold" style={{ color: defaultCurrency === cur ? '#3B82F6' : '#94A3B8', minWidth: 36 }}>{cur}</span>
              <span className="text-sm text-slate-200">{CURRENCY_NAMES[cur][language]}</span>
              {defaultCurrency === cur && <span className="ml-auto text-blue-400">✓</span>}
            </button>
          ))}
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title={t.addCategory} fullHeight>
        <div className="px-5 pb-8 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Тип / Type</label>
            <div className="flex gap-2">
              {(['expense', 'income', 'both'] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => setNewCatType(tp)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold active-scale transition-all"
                  style={{
                    background: newCatType === tp ? '#3B82F6' : '#1E1E38',
                    color: newCatType === tp ? 'white' : '#64748B',
                    border: newCatType === tp ? '1px solid #3B82F6' : '1px solid #1E2A40',
                  }}
                >
                  {tp === 'expense' ? t.expenses : tp === 'income' ? t.income : 'Both'}
                </button>
              ))}
            </div>
          </div>

          {/* Name RU */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Название (RU)</label>
            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Например: Спорт" className="w-full px-4 py-3"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Name (EN)</label>
            <input type="text" value={newCatNameEn} onChange={(e) => setNewCatNameEn(e.target.value)}
              placeholder="e.g.: Sports" className="w-full px-4 py-3"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#F1F5F9' }} />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">{t.icon}</label>
            <div className="grid grid-cols-8 gap-2">
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => setNewCatIcon(ic)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl active-scale"
                  style={{ background: newCatIcon === ic ? 'rgba(59,130,246,0.2)' : '#1E1E38', border: newCatIcon === ic ? '2px solid #3B82F6' : '2px solid transparent' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">{t.color}</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setNewCatColor(c)}
                  className="w-8 h-8 rounded-xl active-scale"
                  style={{ background: c, border: newCatColor === c ? '3px solid white' : '3px solid transparent' }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#1E1E38' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${newCatColor}22` }}>
              <span className="text-xl">{newCatIcon}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{newCatName || '—'}</p>
              <p className="text-xs text-slate-500">{newCatNameEn || '—'}</p>
            </div>
          </div>

          <button
            onClick={handleAddCategory}
            disabled={!newCatName.trim()}
            className="w-full py-3.5 rounded-2xl font-semibold text-white active-scale disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
          >
            {t.add}
          </button>
        </div>
      </Modal>

      {/* Import / Export Modal */}
      <ImportExportModal isOpen={showImportExport} onClose={() => setShowImportExport(false)} />

      {/* Feedback Modal */}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />

      {/* Clear Data Confirm */}
      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">{t.clearDataWarning}</p>
          <div className="flex gap-3">
            <button onClick={() => setShowClearConfirm(false)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => { clearAllData(); setShowClearConfirm(false); }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, icon, children }: { title: React.ReactNode; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-5 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-400">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}
