import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { PRESET_CATEGORIES } from '../utils';
import {
  SEED_ACCOUNTS,
  SEED_TRANSACTIONS,
  SEED_BUDGETS,
  SEED_PLANNED,
  SEED_DEBTS,
} from '../seedData';

import Dashboard from './Dashboard';
import Accounts from './Accounts';
import Statistics from './Statistics';
import Calendar from './Calendar';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Главная',
  accounts: 'Счета',
  statistics: 'Статистика',
  calendar: 'Календарь',
};

function PhoneContent({ page }: { page: string }) {
  if (page === 'accounts') return <Accounts />;
  if (page === 'statistics') return <Statistics />;
  if (page === 'calendar') return <Calendar />;
  return <Dashboard />;
}

export default function ScreenshotFrame() {
  const [ready, setReady] = useState(false);
  const [params] = useSearchParams();
  const page = params.get('page') || 'dashboard';
  const portrait = params.get('portrait') === '1' || params.get('portrait') === 'true';

  useEffect(() => {
    document.body.style.maxWidth = 'none';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

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
    const scrollY = parseInt(params.get('scroll') || '0', 10);
    setTimeout(() => {
      setReady(true);
      if (scrollY > 0) {
        const el = document.querySelector('[data-phone-content]');
        if (el) el.scrollTop = scrollY;
      }
    }, 400);

    return () => {
      document.body.style.maxWidth = '';
      document.body.style.margin = '';
      document.body.style.overflow = '';
    };
  }, []);

  if (portrait) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(160deg, #0a0a1a 0%, #0d1b3e 40%, #1a0a2e 70%, #07070F 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
          zIndex: 9999,
          padding: '36px 24px 32px',
          boxSizing: 'border-box',
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: '5%', left: '10%',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '8%', right: '8%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '45%', right: '5%',
          width: 180, height: 180, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top: Logo + tagline */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          opacity: ready ? 1 : 0, transition: 'opacity 0.4s',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 36 }}>💰</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', fontFamily: 'system-ui' }}>FinCalendar</span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: 15, fontFamily: 'system-ui', textAlign: 'center', lineHeight: 1.5 }}>
            Умный учёт финансов в вашем кармане
          </div>
        </div>

        {/* Phone mockup */}
        <div style={{
          position: 'relative',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.5s',
          zIndex: 1,
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 0',
        }}>
          <div style={{
            width: 340,
            height: 740,
            borderRadius: 48,
            background: '#1a1a2e',
            border: '2px solid rgba(255,255,255,0.12)',
            boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 0 1px rgba(255,255,255,0.06)',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Status bar */}
            <div style={{
              height: 36,
              background: '#07070F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 18px',
              flexShrink: 0,
            }}>
              <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'system-ui', fontWeight: 500 }}>9:41</span>
              <div style={{
                width: 70, height: 18, borderRadius: 9,
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
              }} />
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: 10 }}>●●●</span>
              </div>
            </div>

            {/* App content */}
            <div
              data-phone-content
              style={{
                flex: 1,
                overflow: 'auto',
                position: 'relative',
                background: '#07070F',
              }}
            >
              <div style={{
                width: 480,
                transform: 'scale(0.708)',
                transformOrigin: 'top left',
              }}>
                {ready && <PhoneContent page={page} />}
              </div>
            </div>

            {/* Home indicator */}
            <div style={{
              height: 24, background: '#07070F',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{
                width: 90, height: 3, borderRadius: 2,
                background: 'rgba(255,255,255,0.25)',
              }} />
            </div>
          </div>
        </div>

        {/* Bottom: page label + features */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          opacity: ready ? 1 : 0, transition: 'opacity 0.4s',
          zIndex: 1,
        }}>
          <div style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 12,
            padding: '8px 20px',
            color: '#a5b4fc',
            fontSize: 15,
            fontFamily: 'system-ui',
            fontWeight: 600,
          }}>
            {PAGE_LABELS[page] || page}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: '📊', text: 'Статистика' },
              { icon: '📅', text: 'Платежи' },
              { icon: '💳', text: 'Счета' },
              { icon: '🎯', text: 'Бюджеты' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ color: '#cbd5e1', fontSize: 12, fontFamily: 'system-ui' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Landscape (original) layout ---
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b3e 35%, #1a0a2e 65%, #07070F 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        zIndex: 9999,
      }}
    >
      {/* Decorative orbs */}
      <div style={{
        position: 'absolute', top: '8%', left: '6%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', right: '18%',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left side text */}
      <div style={{
        position: 'absolute', left: '5%', top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 16,
        opacity: ready ? 1 : 0, transition: 'opacity 0.4s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>💰</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', fontFamily: 'system-ui' }}>FinCalendar</span>
        </div>
        <div style={{ color: '#94a3b8', fontSize: 15, fontFamily: 'system-ui', maxWidth: 220, lineHeight: 1.6 }}>
          Умный учёт финансов в вашем кармане
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[
            { icon: '📊', text: 'Статистика расходов' },
            { icon: '📅', text: 'Плановые платежи' },
            { icon: '💳', text: 'Несколько счетов' },
            { icon: '🎯', text: 'Бюджеты по категориям' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ color: '#cbd5e1', fontSize: 13, fontFamily: 'system-ui' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phone mockup */}
      <div style={{
        position: 'relative',
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.5s',
      }}>
        {/* Phone frame */}
        <div style={{
          width: 380,
          height: 820,
          borderRadius: 48,
          background: '#1a1a2e',
          border: '2px solid rgba(255,255,255,0.12)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Notch / status bar */}
          <div style={{
            height: 40,
            background: '#07070F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            flexShrink: 0,
          }}>
            <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'system-ui', fontWeight: 500 }}>9:41</span>
            <div style={{
              width: 80, height: 20, borderRadius: 10,
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: 10 }}>●●●</span>
            </div>
          </div>

          {/* App content */}
          <div
            data-phone-content
            style={{
              flex: 1,
              overflow: 'auto',
              position: 'relative',
              background: '#07070F',
            }}
          >
            <div style={{
              width: 480,
              transform: 'scale(0.79)',
              transformOrigin: 'top left',
            }}>
              {ready && <PhoneContent page={page} />}
            </div>
          </div>

          {/* Home indicator */}
          <div style={{
            height: 28, background: '#07070F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{
              width: 100, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.25)',
            }} />
          </div>
        </div>
      </div>

      {/* Right side: section label */}
      <div style={{
        position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)',
        opacity: ready ? 1 : 0, transition: 'opacity 0.4s',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12,
      }}>
        <div style={{
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 12,
          padding: '8px 16px',
          color: '#a5b4fc',
          fontSize: 14,
          fontFamily: 'system-ui',
          fontWeight: 600,
        }}>
          {PAGE_LABELS[page] || page}
        </div>
        <div style={{ color: '#475569', fontSize: 12, fontFamily: 'system-ui', textAlign: 'right', maxWidth: 160, lineHeight: 1.6 }}>
          Личный финансовый помощник
        </div>
      </div>
    </div>
  );
}
