# MASTER HUB

MASTER HUB — Telegram Mini App для поиска локальных мастеров и онлайн-записи. Первый город запуска — Калининград.

## Что уже работает

- Telegram WebApp authentication через проверку `initData` на Supabase Edge Function.
- Каталог одобренных мастеров, профили, портфолио, Flash-каталог, услуги и стили.
- Избранное и клиентская онлайн-запись на свободные интервалы.
- Кабинет мастера: профиль, портфолио, услуги, календарь, заявки, записи и статистика.
- Согласование стоимости: мастер предлагает цену, клиент подтверждает или отклоняет.
- Студии: создание, приглашения, роли владельца/модератора/участника, общая статистика и календарь.
- Админ-панель для модерации анкет и просмотра записей.
- Telegram-уведомления о новых заявках и напоминания о сеансах.

## Стек

- React 18 + Vite 6
- Supabase Auth, Postgres, Storage, Realtime и Edge Functions
- Telegram Mini Apps
- Vercel

## Локальный запуск

Требуется Node.js 20 или новее.

```bash
npm install
cp .env.example .env
npm run dev
```

Production-сборка:

```bash
npm run build
npm run preview
```

## Переменные окружения фронтенда

- `VITE_SUPABASE_URL` — URL Supabase проекта.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable key Supabase (подойдёт и legacy anon key).

В браузер можно передавать только publishable/anon key. **Никогда не добавляй `service_role`, Telegram bot token или другие серверные секреты в переменные с префиксом `VITE_`.** Секреты Edge Functions хранятся в Supabase на серверной стороне.

## Supabase Edge Functions

В репозитории находятся:

- `telegram-auth` — проверяет подпись и срок действия Telegram `initData`, затем выдаёт Supabase session.
- `masterhub-notifications` — отправляет уведомления о заявках и напоминания.
- `notify-new-master` — уведомляет администраторов о новой анкете мастера.

## База данных и миграции

SQL-миграции находятся в `supabase/migrations`. В действующем Supabase-проекте применена более полная история миграций, чем сейчас сохранена в GitHub: часть старых миграций ещё нужно восстановить в репозитории.

**Не используй только `0001_initial_schema.sql` для развёртывания новой рабочей базы:** он не создаёт всю текущую функциональность. Перед созданием нового окружения нужно восстановить недостающие миграции и применить их по порядку.

## Деплой

Push в ветку `main` запускает production build и deployment в Vercel. После изменений проверяй статус последнего production deployment.
