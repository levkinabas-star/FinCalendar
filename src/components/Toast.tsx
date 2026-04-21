import { useEffect, useState } from 'react';
import { X, Bell, AlertTriangle, TrendingDown, Calendar, CheckCircle } from 'lucide-react';

export type ToastType = 'payment' | 'debt' | 'budget' | 'balance' | 'info' | 'success';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  payment: <Calendar size={16} color="#3B82F6" />,
  debt: <AlertTriangle size={16} color="#F59E0B" />,
  budget: <TrendingDown size={16} color="#EF4444" />,
  balance: <AlertTriangle size={16} color="#EF4444" />,
  info: <Bell size={16} color="#6366F1" />,
  success: <CheckCircle size={16} color="#10B981" />,
};

const COLORS: Record<ToastType, string> = {
  payment: '#3B82F6',
  debt: '#F59E0B',
  budget: '#EF4444',
  balance: '#EF4444',
  info: '#6366F1',
  success: '#10B981',
};

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 50);
    const hide = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, 6000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [onDismiss]);

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg transition-all duration-300"
      style={{
        background: '#1A1A2E',
        border: `1px solid ${COLORS[item.type]}40`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${COLORS[item.type]}20` }}
      >
        {ICONS[item.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{item.message}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
      >
        <X size={14} color="#94A3B8" />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast item={t} onDismiss={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
