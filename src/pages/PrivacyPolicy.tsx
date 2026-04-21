import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { useStore } from '../store';

export default function PrivacyPolicy() {
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
          {ru ? 'Политика конфиденциальности' : 'Privacy Policy'}
        </h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Icon */}
        <div className="flex justify-center py-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Shield size={32} color="#10B981" />
          </div>
        </div>

        <div className="px-4 py-4 rounded-2xl" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
          <p className="text-xs text-slate-500 mb-3">
            {ru ? 'Последнее обновление: 17 апреля 2026 г.' : 'Last updated: April 17, 2026'}
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            {ru
              ? 'Мы серьёзно относимся к вашей конфиденциальности. Этот документ объясняет, какие данные собирает приложение FinCalendar и как они используются.'
              : 'We take your privacy seriously. This document explains what data FinCalendar collects and how it is used.'}
          </p>
        </div>

        {/* Key point — no server data */}
        <div className="px-4 py-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div className="flex items-start gap-3">
            <Shield size={18} color="#10B981" className="mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-300 leading-relaxed font-medium">
              {ru
                ? 'Все ваши финансовые данные хранятся исключительно на вашем устройстве. Мы не собираем и не передаём их на какие-либо серверы.'
                : 'All your financial data is stored exclusively on your device. We do not collect or transmit it to any servers.'}
            </p>
          </div>
        </div>

        <Section title={ru ? '1. Какие данные мы собираем' : '1. Data We Collect'}>
          {ru
            ? 'FinCalendar не собирает персональные данные пользователей. Все финансовые записи (транзакции, счета, долги, категории) хранятся локально в хранилище браузера или устройства (localStorage / Capacitor Storage) и не покидают ваше устройство.'
            : 'FinCalendar does not collect personal user data. All financial records (transactions, accounts, debts, categories) are stored locally in browser or device storage (localStorage / Capacitor Storage) and never leave your device.'}
        </Section>

        <Section title={ru ? '2. Аналитика и телеметрия' : '2. Analytics and Telemetry'}>
          {ru
            ? 'Приложение не использует сторонние аналитические сервисы, не отправляет телеметрию и не отслеживает действия пользователя.'
            : 'The App does not use third-party analytics services, does not send telemetry, and does not track user actions.'}
        </Section>

        <Section title={ru ? '3. Обратная связь' : '3. Feedback'}>
          {ru
            ? 'Если вы отправляете отзыв через форму обратной связи, вы по собственному желанию передаёте текст сообщения. Эти данные используются исключительно для ответа на ваш запрос и улучшения Приложения.'
            : 'If you submit feedback via the feedback form, you voluntarily provide your message text. This data is used solely to respond to your request and improve the App.'}
        </Section>

        <Section title={ru ? '4. Экспорт данных' : '4. Data Export'}>
          {ru
            ? 'Функция экспорта позволяет вам создать резервную копию своих данных в формате JSON. Файл сохраняется на вашем устройстве. Разработчик не имеет доступа к экспортируемым файлам.'
            : 'The export feature lets you create a backup of your data in JSON format. The file is saved on your device. The Developer has no access to exported files.'}
        </Section>

        <Section title={ru ? '5. Безопасность' : '5. Security'}>
          {ru
            ? 'Поскольку данные хранятся локально, их безопасность зависит от защиты вашего устройства. Рекомендуем использовать блокировку экрана и регулярно создавать резервные копии через функцию экспорта.'
            : 'Since data is stored locally, its security depends on your device protection. We recommend using screen lock and regularly creating backups via the export feature.'}
        </Section>

        <Section title={ru ? '6. Изменения политики' : '6. Policy Changes'}>
          {ru
            ? 'При существенном изменении настоящей Политики мы уведомим об этом через обновление Приложения. Актуальная версия всегда доступна в разделе «Настройки».'
            : 'For material changes to this Policy, we will notify you via an App update. The current version is always available in the Settings section.'}
        </Section>

        <Section title={ru ? '7. Контакты' : '7. Contact'}>
          {ru
            ? 'По вопросам конфиденциальности обращайтесь: Levlinabas@gmail.com'
            : 'For privacy-related questions, contact: Levlinabas@gmail.com'}
        </Section>

        {/* Intellectual property */}
        <div className="px-4 py-4 rounded-2xl" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
          <p className="text-sm font-semibold text-emerald-400 mb-3">
            {ru ? '8. Права на интеллектуальную собственность' : '8. Intellectual Property Rights'}
          </p>
          {ru ? (
            <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
              <p>
                Исключительное авторское право на мобильное приложение <span className="text-slate-100 font-medium">«FinCalendar»</span>, включая его исходный код, дизайн, графические элементы, пользовательский интерфейс и документацию, принадлежит:
              </p>
              <p className="text-slate-100 font-semibold text-center py-2">Левкину Артёму Валерьевичу</p>
              <p>
                Права охраняются в соответствии с законодательством Российской Федерации (Гражданский кодекс РФ, часть IV, гл. 70) и международными договорами в области авторского права.
              </p>
              <p>
                Любое воспроизведение, копирование, распространение, переработка или иное использование Приложения либо его составных частей без письменного разрешения правообладателя запрещено и влечёт гражданскую, административную или уголовную ответственность в соответствии с действующим законодательством.
              </p>
              <p>
                По вопросам лицензирования и правомерного использования обращайтесь: <span className="text-emerald-400">Levlinabas@gmail.com</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
              <p>
                The exclusive copyright to the mobile application <span className="text-slate-100 font-medium">"FinCalendar"</span>, including its source code, design, graphical elements, user interface and documentation, belongs to:
              </p>
              <p className="text-slate-100 font-semibold text-center py-2">Artem Valerievich Levkin</p>
              <p>
                The rights are protected under the legislation of the Russian Federation (Civil Code of the Russian Federation, Part IV, Chapter 70) and international copyright treaties.
              </p>
              <p>
                Any reproduction, copying, distribution, modification or other use of the Application or its components without the written permission of the copyright holder is prohibited and entails civil, administrative or criminal liability under applicable law.
              </p>
              <p>
                For licensing and permitted use inquiries, contact: <span className="text-emerald-400">Levlinabas@gmail.com</span>
              </p>
            </div>
          )}
        </div>

        {/* Copyright footer */}
        <div className="py-6 text-center space-y-1">
          <p className="text-xs text-slate-400 font-medium">© 2026 Левкин Артём Валерьевич / Artem Levkin</p>
          <p className="text-xs text-slate-500">FinCalendar. {ru ? 'Все права защищены.' : 'All rights reserved.'}</p>
          <p className="text-xs text-slate-600">Levlinabas@gmail.com</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <div className="px-4 py-4 rounded-2xl" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
      <p className="text-sm font-semibold text-emerald-400 mb-2">{title}</p>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}
