import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { PRESET_CATEGORIES } from '../utils';
import {
  SEED_ACCOUNTS,
  SEED_TRANSACTIONS,
  SEED_BUDGETS,
  SEED_PLANNED,
  SEED_DEBTS,
} from '../seedData';

export default function Seed() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const importData = useStore((s) => s.importData);
  const activatePro = useStore((s) => s.activatePro);

  useEffect(() => {
    useStore.setState({
      plan: 'pro',
      proExpiry: null,
      language: 'ru',
      defaultCurrency: 'RUB',
      accounts: SEED_ACCOUNTS,
      transactions: SEED_TRANSACTIONS,
      categories: PRESET_CATEGORIES,
      budgets: SEED_BUDGETS,
      plannedExpenses: SEED_PLANNED,
      debts: SEED_DEBTS,
    });

    const to = params.get('to') || '/';
    setTimeout(() => navigate(to, { replace: true }), 300);
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
      <div className="text-center">
        <div className="text-4xl mb-4">💰</div>
        <p className="text-gray-400">Загрузка демо-данных…</p>
      </div>
    </div>
  );
}
