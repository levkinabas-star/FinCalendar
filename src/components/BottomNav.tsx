import { Home, CreditCard, Calendar, BarChart2, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { translations } from '../translations';

interface Props {
  onAddTransaction: () => void;
}

export default function BottomNav({ onAddTransaction }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const language = useStore((s) => s.language);
  const t = translations[language];

  const tabs = [
    { path: '/', icon: Home, label: t.home },
    { path: '/accounts', icon: CreditCard, label: t.accounts },
    { path: '/calendar', icon: Calendar, label: t.calendar },
    { path: '/statistics', icon: BarChart2, label: t.statistics },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass bottom-safe"
      style={{
        maxWidth: 480,
        margin: '0 auto',
        borderTop: '1px solid #1E2A40',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {/* Home */}
        <TabButton
          icon={tabs[0].icon}
          label={tabs[0].label}
          active={isActive(tabs[0].path)}
          onClick={() => navigate(tabs[0].path)}
        />

        {/* Accounts */}
        <TabButton
          icon={tabs[1].icon}
          label={tabs[1].label}
          active={isActive(tabs[1].path)}
          onClick={() => navigate(tabs[1].path)}
        />

        {/* Add Transaction (center FAB) */}
        <button
          onClick={onAddTransaction}
          className="active-scale flex flex-col items-center -mt-5 focus-ring"
          style={{ minWidth: 56 }}
          aria-label={language === 'ru' ? 'Добавить' : 'Add'}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.45)',
            }}
          >
            <Plus size={26} color="white" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] mt-1 text-slate-500">
            {language === 'ru' ? 'Добавить' : 'Add'}
          </span>
        </button>

        {/* Calendar */}
        <TabButton
          icon={tabs[2].icon}
          label={tabs[2].label}
          active={isActive(tabs[2].path)}
          onClick={() => navigate(tabs[2].path)}
        />

        {/* Statistics */}
        <TabButton
          icon={tabs[3].icon}
          label={tabs[3].label}
          active={isActive(tabs[3].path)}
          onClick={() => navigate(tabs[3].path)}
        />
      </div>
    </nav>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="active-scale flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all focus-ring"
      style={{ minWidth: 48 }}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        size={20}
        color={active ? '#3B82F6' : '#475569'}
        strokeWidth={active ? 2.5 : 1.75}
      />
      <span
        className="text-[10px] font-medium transition-colors"
        style={{ color: active ? '#3B82F6' : '#475569' }}
      >
        {label}
      </span>
    </button>
  );
}