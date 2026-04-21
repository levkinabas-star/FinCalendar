import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, fullHeight }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

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
