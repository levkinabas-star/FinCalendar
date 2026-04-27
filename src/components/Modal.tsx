import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useIsDesktop } from '../hooks/useIsDesktop';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, fullHeight }: Props) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  if (isDesktop) {
    return (
      <div
        className="fixed animate-fade-in"
        style={{
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />

        {/* Dialog */}
        <div
          className="animate-scale-in relative"
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: fullHeight ? '88vh' : '80vh',
            background: '#0E0E1C',
            border: '1px solid #1E2A40',
            borderRadius: 24,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          {title && title.trim() ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #1E2A40',
                flexShrink: 0,
              }}
            >
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#F1F5F9', margin: 0 }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                className="active-scale"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#1E1E38',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} color="#94A3B8" />
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '14px 18px 4px',
                flexShrink: 0,
              }}
            >
              <button
                onClick={onClose}
                className="active-scale"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#1E1E38',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} color="#94A3B8" />
              </button>
            </div>
          )}

          {/* Content */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Mobile: bottom sheet
  return (
    <div
      className="fixed inset-0 z-50 flex items-end animate-fade-in"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`relative w-full animate-slide-up rounded-t-3xl overflow-hidden ${fullHeight ? 'max-h-[92vh]' : 'max-h-[92vh]'}`}
        style={{ background: '#0E0E1C', border: '1px solid #1E2A40', borderBottom: 'none' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#1E2A40' }} />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center active-scale"
              style={{ background: '#1E1E38' }}
            >
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`overflow-y-auto ${fullHeight ? 'max-h-[80vh]' : 'max-h-[80vh]'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
