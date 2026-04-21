import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const language = useStore((s) => s.language);
  const t = translations[language];
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <div
      className="fixed top-4 left-4 right-4 z-50 rounded-2xl p-4 flex items-center gap-3 animate-slide-down"
      style={{
        background: 'linear-gradient(135deg, #1A2744 0%, #0E1929 100%)',
        border: '1px solid #1E3A5F',
        maxWidth: 440,
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(59,130,246,0.2)' }}
      >
        <Download size={18} color="#3B82F6" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">
          {language === 'ru' ? 'Установить приложение' : 'Install App'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {language === 'ru'
            ? 'Добавить на рабочий стол Android'
            : 'Add to Android home screen'}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white active-scale"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
        >
          {language === 'ru' ? 'Установить' : 'Install'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center active-scale"
          style={{ background: '#1E1E38' }}
        >
          <X size={13} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
}
