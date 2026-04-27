import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store';

const API_URL = import.meta.env.VITE_API_URL || '';

function addMonths(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

export default function PaymentReturn() {
  const navigate = useNavigate();
  const { activateProWithExpiry, language } = useStore();
  const isRu = language === 'ru';
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'cancelled'>('checking');

  useEffect(() => {
    const paymentId = localStorage.getItem('yk_pending_payment_id');
    if (!paymentId) {
      setStatus('cancelled');
      return;
    }

    let attempts = 0;
    const MAX = 20;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payments/${paymentId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.status === 'succeeded') {
          localStorage.removeItem('yk_pending_payment_id');
          const expiry = data.billing === 'monthly' ? addMonths(1) : addMonths(12);
          activateProWithExpiry(expiry);
          setStatus('success');
          setTimeout(() => navigate('/'), 2000);
        } else if (data.status === 'canceled') {
          localStorage.removeItem('yk_pending_payment_id');
          setStatus('cancelled');
        } else if (attempts < MAX) {
          attempts++;
          setTimeout(poll, 3000);
        } else {
          setStatus('failed');
        }
      } catch {
        if (attempts < MAX) {
          attempts++;
          setTimeout(poll, 3000);
        } else {
          setStatus('failed');
        }
      }
    };

    poll();
  }, [activateProWithExpiry, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ background: '#07070F' }}>
      {status === 'checking' && (
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-5"
          />
          <p className="text-slate-200 text-lg font-semibold">
            {isRu ? 'Проверяем оплату…' : 'Verifying payment…'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {isRu ? 'Это займёт несколько секунд' : 'This will take a few seconds'}
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <CheckCircle size={72} color="#10B981" className="mx-auto mb-4" />
          <p className="text-white text-2xl font-bold mb-1">
            {isRu ? 'Оплата прошла!' : 'Payment successful!'}
          </p>
          <p className="text-slate-400 text-sm">
            {isRu ? 'Pro активирован. Возвращаемся…' : 'Pro activated. Redirecting…'}
          </p>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="text-center">
          <XCircle size={72} color="#64748B" className="mx-auto mb-4" />
          <p className="text-white text-xl font-bold mb-2">
            {isRu ? 'Оплата отменена' : 'Payment cancelled'}
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="mt-4 px-6 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: '#1E1E38', color: '#94A3B8' }}
          >
            {isRu ? 'Назад к тарифам' : 'Back to plans'}
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center">
          <XCircle size={72} color="#EF4444" className="mx-auto mb-4" />
          <p className="text-white text-xl font-bold mb-2">
            {isRu ? 'Не удалось проверить оплату' : 'Payment verification failed'}
          </p>
          <p className="text-slate-400 text-sm mb-6">
            {isRu
              ? 'Если деньги были списаны — напишите нам, мы всё исправим.'
              : 'If you were charged, please contact us.'}
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: '#3B82F6', color: 'white' }}
          >
            {isRu ? 'К тарифам' : 'Plans'}
          </button>
        </div>
      )}
    </div>
  );
}
