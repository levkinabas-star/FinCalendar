import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

interface Props {
  feature: string;
  featureEn?: string;
  children: React.ReactNode;
}

export default function ProGate({ feature, featureEn, children }: Props) {
  const navigate = useNavigate();
  const language = useStore((s) => s.language);
  const isRu = language === 'ru';

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{ background: 'rgba(7,7,15,0.75)' }}
      >
        <div
          className="flex flex-col items-center gap-4 px-6 py-7 rounded-3xl mx-6"
          style={{ background: '#12122A', border: '1px solid #2D2D5A', maxWidth: 320 }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}
          >
            <Crown size={26} color="white" />
          </div>
          <div className="text-center">
            <p className="text-slate-100 font-bold text-lg mb-1">
              {isRu ? 'Функция Pro' : 'Pro Feature'}
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              {isRu
                ? `«${feature}» доступна только в Pro-плане`
                : `"${featureEn ?? feature}" is available in the Pro plan only`}
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-3 rounded-2xl font-bold text-white text-sm active-scale"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}
          >
            {isRu ? 'Перейти к тарифам' : 'View Plans'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Small inline upgrade prompt for use inside cards/forms
export function UpgradePrompt({ message, messageEn }: { message: string; messageEn?: string }) {
  const navigate = useNavigate();
  const language = useStore((s) => s.language);
  const isRu = language === 'ru';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: '#1A1A30', border: '1px solid #2D2D5A' }}
    >
      <Crown size={16} color="#F59E0B" />
      <p className="text-slate-400 text-sm flex-1">{isRu ? message : (messageEn ?? message)}</p>
      <button
        onClick={() => navigate('/pricing')}
        className="text-xs font-bold px-3 py-1.5 rounded-xl active-scale"
        style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', color: 'white' }}
      >
        Pro
      </button>
    </div>
  );
}
