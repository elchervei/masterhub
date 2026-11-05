# MASTER HUB

Telegram Mini App для поиска тату-мастеров и онлайн-записи. Первый город запуска — Калининград.

## Текущий этап

Сейчас в репозитории находится frontend-прототип на React + Vite:
- главная страница и популярные направления;
- каталог с поиском, фильтрами и сортировкой;
- карточки и страницы мастеров с портфолио;
- избранное;
- демонстрационный сценарий онлайн-записи;
- клиентский профиль и переключатель демонстрационного кабинета мастера;
- адаптация под Telegram WebApp и мобильные экраны.

Данные пока демонстрационные. Авторизация Telegram, база данных, реальная проверка доступности слотов, уведомления и модерация будут подключены на следующем этапе через Supabase.

## Запуск локально

Требуется Node.js 20 или новее.

```bash
npm install
npm run dev
```

Для production-сборки:

```bash
npm run build
npm run preview
```

## Стек

- React
- Vite
- CSS
- Telegram WebApp SDK (через объект `window.Telegram.WebApp`, если приложение открыто внутри Telegram)
- Supabase — планируемый backend
- Vercel — планируемый hosting

## Переменные окружения

На текущем frontend-этапе переменные окружения не требуются. Не добавляйте секретные ключи в клиентский код. Для будущей интеграции Supabase используйте публичный anon/publishable key на клиенте и храните service role key только на серверной стороне.

## Важно

Демо-слоты и заявки не являются реальными бронированиями. До подключения backend интерфейс только показывает пользовательский сценарий.


## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `supabase/migrations/0001_initial_schema.sql` in this repository, copy the complete contents, paste into SQL Editor, and run it.
4. In **Project Settings → API**, copy the Project URL and the publishable key (or legacy anon key).
5. Create a local `.env` file from `.env.example` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Never put the `service_role` key in frontend code or Vercel environment variables prefixed with `VITE_`. The migration enables Row Level Security and creates the initial schema. Telegram authentication, admin bootstrap, and the live frontend data adapter are the next integration step; the existing screens still use demo data until that work is completed.
