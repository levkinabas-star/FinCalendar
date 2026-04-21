import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useStore } from '../store';

export default function UserAgreement() {
  const navigate = useNavigate();
  const language = useStore((s) => s.language);
  const ru = language === 'ru';

  return (
    <div className="min-h-screen pb-16" style={{ background: '#07070F' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-6 pb-4 flex items-center gap-3" style={{ background: '#07070F' }}>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active-scale"
          style={{ background: '#1E1E38' }}
        >
          <ArrowLeft size={18} color="#94A3B8" />
        </button>
        <h1 className="text-xl font-bold text-slate-100">
          {ru ? 'Пользовательское соглашение' : 'Terms of Service'}
        </h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Icon */}
        <div className="flex justify-center py-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <FileText size={32} color="#6366F1" />
          </div>
        </div>

        <Card>
          <p className="text-xs text-slate-500 mb-3">
            {ru ? 'Последнее обновление: 17 апреля 2026 г.' : 'Last updated: April 17, 2026'}
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            {ru
              ? 'Используя приложение FinCalendar, вы принимаете условия настоящего Пользовательского соглашения. Пожалуйста, внимательно прочитайте его перед началом использования.'
              : 'By using the FinCalendar application, you agree to these Terms of Service. Please read them carefully before use.'}
          </p>
        </Card>

        <Section title={ru ? '1. Принятие условий' : '1. Acceptance of Terms'}>
          {ru
            ? 'Настоящее Соглашение регулирует использование приложения FinCalendar (далее — «Приложение»), разработанного и предоставляемого его авторами (далее — «Разработчик»). Если вы не согласны с данными условиями, вы не вправе использовать Приложение.'
            : 'This Agreement governs your use of the FinCalendar application (the "App") developed and provided by its authors (the "Developer"). If you do not agree to these terms, you may not use the App.'}
        </Section>

        <Section title={ru ? '2. Описание сервиса' : '2. Service Description'}>
          {ru
            ? 'FinCalendar — персональный финансовый трекер, позволяющий вести учёт доходов, расходов, долгов и планируемых трат. Приложение работает локально на вашем устройстве. Данные хранятся исключительно на устройстве пользователя и не передаются на серверы Разработчика.'
            : 'FinCalendar is a personal finance tracker for managing income, expenses, debts, and planned payments. The App operates locally on your device. All data is stored exclusively on your device and is not transmitted to any Developer servers.'}
        </Section>

        <Section title={ru ? '3. Права и ограничения' : '3. Rights and Restrictions'}>
          {ru
            ? 'Разработчик предоставляет вам ограниченную, неисключительную, непередаваемую лицензию на использование Приложения в личных некоммерческих целях. Запрещается: копировать, декомпилировать, модифицировать исходный код; распространять Приложение или его части третьим лицам; использовать Приложение в незаконных целях.'
            : 'The Developer grants you a limited, non-exclusive, non-transferable license to use the App for personal, non-commercial purposes. You may not: copy, decompile, or modify the source code; distribute the App or parts thereof to third parties; use the App for any illegal purposes.'}
        </Section>

        <Section title={ru ? '4. Интеллектуальная собственность' : '4. Intellectual Property'}>
          {ru
            ? 'Все права на Приложение, включая исходный код, дизайн, логотип, графические материалы и иной контент, принадлежат Разработчику и защищены законодательством об авторском праве. Использование без письменного разрешения запрещено.'
            : 'All rights to the App, including source code, design, logo, graphics, and other content, belong to the Developer and are protected by copyright law. Any use without written permission is prohibited.'}
        </Section>

        <Section title={ru ? '5. Отказ от гарантий' : '5. Disclaimer of Warranties'}>
          {ru
            ? 'Приложение предоставляется «как есть» без каких-либо явных или подразумеваемых гарантий. Разработчик не несёт ответственности за потерю данных, финансовые решения, принятые на основе данных Приложения, а также за любые косвенные убытки.'
            : 'The App is provided "as is" without any express or implied warranties. The Developer is not liable for data loss, financial decisions made based on App data, or any indirect damages.'}
        </Section>

        <Section title={ru ? '6. Изменение условий' : '6. Changes to Terms'}>
          {ru
            ? 'Разработчик оставляет за собой право изменять условия настоящего Соглашения. О существенных изменениях будет сообщено через обновление Приложения. Продолжение использования Приложения означает согласие с изменёнными условиями.'
            : 'The Developer reserves the right to modify these Terms. Material changes will be communicated via App updates. Continued use of the App constitutes acceptance of the modified terms.'}
        </Section>

        <Section title={ru ? '7. Применимое право' : '7. Governing Law'}>
          {ru
            ? 'Настоящее Соглашение регулируется законодательством Российской Федерации. Все споры разрешаются в судебном порядке по месту нахождения Разработчика.'
            : 'This Agreement is governed by the applicable law. Any disputes shall be resolved through the courts of competent jurisdiction.'}
        </Section>

        {/* Copyright footer */}
        <div className="py-6 text-center">
          <p className="text-xs text-slate-500">© 2026 FinCalendar. {ru ? 'Все права защищены.' : 'All rights reserved.'}</p>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-4 rounded-2xl" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <div className="px-4 py-4 rounded-2xl" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
      <p className="text-sm font-semibold text-blue-400 mb-2">{title}</p>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}
