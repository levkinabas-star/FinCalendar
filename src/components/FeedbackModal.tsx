import { useState } from 'react';
import { Lightbulb, AlertCircle, Send } from 'lucide-react';
import Modal from './Modal';
import { useStore } from '../store';
import { translations } from '../translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'idea' | 'problem';

const DEVELOPER_EMAIL = 'levkinabas@gmail.com';

export default function FeedbackModal({ isOpen, onClose }: Props) {
  const language = useStore((s) => s.language);
  const t = translations[language];
  const [type, setType] = useState<FeedbackType>('idea');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;

    const subject = type === 'idea'
      ? (language === 'ru' ? 'Идея для FinCalendar' : 'Idea for FinCalendar')
      : (language === 'ru' ? 'Проблема в FinCalendar' : 'Problem in FinCalendar');

    const body = encodeURIComponent(message.trim());
    const subjectEncoded = encodeURIComponent(subject);

    window.open(`mailto:${DEVELOPER_EMAIL}?subject=${subjectEncoded}&body=${body}`, '_blank');
    setSent(true);
  };

  const handleClose = () => {
    setMessage('');
    setType('idea');
    setSent(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t.feedbackTitle}>
      <div className="px-5 pb-6 space-y-4">
        {sent ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)' }}>
              <Send size={24} color="#10B981" />
            </div>
            <p className="text-base font-semibold text-slate-200">{t.feedbackSentTitle}</p>
            <p className="text-sm text-slate-400">{t.feedbackSentDesc}</p>
            <button
              onClick={handleClose}
              className="mt-2 px-6 py-2.5 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
            >
              {t.close}
            </button>
          </div>
        ) : (
          <>
            {/* Type selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setType('idea')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold active-scale transition-all"
                style={{
                  background: type === 'idea' ? 'rgba(245,158,11,0.15)' : '#1E1E38',
                  border: type === 'idea' ? '1.5px solid #F59E0B' : '1.5px solid #1E2A40',
                  color: type === 'idea' ? '#F59E0B' : '#64748B',
                }}
              >
                <Lightbulb size={15} />
                {t.feedbackIdea}
              </button>
              <button
                onClick={() => setType('problem')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold active-scale transition-all"
                style={{
                  background: type === 'problem' ? 'rgba(239,68,68,0.15)' : '#1E1E38',
                  border: type === 'problem' ? '1.5px solid #EF4444' : '1.5px solid #1E2A40',
                  color: type === 'problem' ? '#EF4444' : '#64748B',
                }}
              >
                <AlertCircle size={15} />
                {t.feedbackProblem}
              </button>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                {t.feedbackMessage}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={type === 'idea' ? t.feedbackIdeaPlaceholder : t.feedbackProblemPlaceholder}
                rows={5}
                className="w-full px-4 py-3 resize-none"
                style={{
                  background: '#1E1E38',
                  border: '1px solid #1E2A40',
                  borderRadius: 12,
                  color: '#F1F5F9',
                  outline: 'none',
                  fontSize: 14,
                }}
              />
            </div>

            {/* Email hint */}
            <p className="text-xs text-slate-500 text-center">
              {t.feedbackEmailHint} <span className="text-blue-400">{DEVELOPER_EMAIL}</span>
            </p>

            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white active-scale disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
            >
              <Send size={16} />
              {t.feedbackSend}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
