import { Home, CreditCard, Calendar, BarChart2, Plus, Settings, Star, Wallet } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { translations } from '../translations';
import { formatAmount } from '../utils';
import { colors } from './ui';

interface Props {
  onAddTransaction: () => void;
}

export default function DesktopSidebar({ onAddTransaction }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const language = useStore((s) => s.language);
  const t = translations[language];
  const accounts = useStore((s) => s.accounts);
  const defaultCurrency = useStore((s) => s.defaultCurrency);
  const plan = useStore((s) => s.plan);
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const navItems = [
    { path: '/', icon: Home, label: t.home },
    { path: '/accounts', icon: CreditCard, label: t.accounts },
    { path: '/calendar', icon: Calendar, label: t.calendar },
    { path: '/statistics', icon: BarChart2, label: t.statistics },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const accountCountLabel = () => {
    const n = accounts.length;
    if (language === 'ru') {
      if (n === 1) return '1 счёт';
      if (n >= 2 && n <= 4) return `${n} счёта`;
      return `${n} счетов`;
    }
    return `${n} ${n === 1 ? 'account' : 'accounts'}`;
  };

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: colors.card,
        borderRight: `1px solid ${colors.border}`,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
      }}
    >
      {/* Logo header */}
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
              flexShrink: 0,
            }}
          >
            <Wallet size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>
              FinCalendar
            </p>
            {plan === 'pro' && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#F59E0B',
                }}
              >
                PRO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: colors.border, margin: '0 16px 12px' }} />

      {/* Navigation */}
      <nav style={{ padding: '0 10px', flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="active-scale"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 12px',
                borderRadius: 10,
                background: active ? `${colors.primary}18` : 'transparent',
                border: `1px solid ${active ? `${colors.primary}35` : 'transparent'}`,
                color: active ? colors.primary : colors.textMuted,
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                marginBottom: 2,
                transition: 'all 0.15s',
              }}
            >
              <item.icon size={17} strokeWidth={active ? 2.5 : 1.75} />
              {item.label}
            </button>
          );
        })}

        {/* Add button */}
        <button
          onClick={onAddTransaction}
          className="active-scale"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            border: 'none',
            width: '100%',
            marginTop: 10,
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.28)',
            transition: 'all 0.15s',
          }}
        >
          <Plus size={17} strokeWidth={2.5} />
          {language === 'ru' ? 'Добавить' : 'Add'}
        </button>
      </nav>

      {/* Bottom section */}
      <div
        style={{
          padding: '12px 10px 16px',
          borderTop: `1px solid ${colors.border}`,
          marginTop: 8,
        }}
      >
        {/* Balance card */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #1A2744 0%, #0E1929 100%)',
            border: '1px solid #1E3A5F',
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: colors.textMuted,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 5,
            }}
          >
            {language === 'ru' ? 'Общий баланс' : 'Total Balance'}
          </p>
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: totalBalance >= 0 ? colors.text : colors.danger,
              lineHeight: 1.2,
            }}
          >
            {formatAmount(totalBalance, defaultCurrency as any)}
          </p>
          <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
            {accountCountLabel()}
          </p>
        </div>

        {/* Pro upgrade */}
        {plan !== 'pro' && (
          <button
            onClick={() => navigate('/pricing')}
            className="active-scale"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '9px 12px',
              borderRadius: 10,
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.22)',
              color: '#F59E0B',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              width: '100%',
              marginBottom: 4,
              transition: 'all 0.15s',
            }}
          >
            <Star size={14} fill="#F59E0B" color="#F59E0B" />
            {language === 'ru' ? 'Улучшить до Pro' : 'Upgrade to Pro'}
          </button>
        )}

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="active-scale"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '9px 12px',
            borderRadius: 10,
            background: isActive('/settings') ? `${colors.primary}18` : 'transparent',
            border: `1px solid ${isActive('/settings') ? `${colors.primary}35` : 'transparent'}`,
            color: isActive('/settings') ? colors.primary : colors.textMuted,
            fontWeight: 500,
            fontSize: 13,
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.15s',
          }}
        >
          <Settings size={15} strokeWidth={isActive('/settings') ? 2.5 : 1.75} />
          {t.settings}
        </button>
      </div>
    </aside>
  );
}
