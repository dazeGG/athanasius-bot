# Roadmap: Monorepo + Telegram Mini App

## Фаза 1: Монорепа ✅
- pnpm workspaces
- Бот переезжает в `packages/bot`
- Корневые `tsconfig.base.json`, `package.json`
- Раздельные `.gitignore` для корня и пакетов
- Версия только в корневом `package.json`

## Фаза 2: packages/shared

### Аудит `packages/bot/src/entities` (готово)

Текущее состояние: `entities` — это **не доменный слой**, а смесь домена + БД-доступа + Telegram-транспорта + presentation. Просто перенести нельзя. Карта зависимостей:

| Файл | Готов к переезду | Что мешает |
|---|---|---|
| `deck/types.ts` | ✅ | — |
| `deck/config.ts` | ✅ | — |
| `deck/deck.ts` | ✅ | только `lodash` |
| `deck/index.ts` | ✅ | реэкспорты |
| `game/types.ts` | ⚠️ типы | `~/db` (типы доменных сущностей лежат в db-слое) |
| `game/utils/mailing.ts` | ✅ после game | внутренние импорты |
| `game/model/queue.ts` | ⚠️ | `~/shared/lib` (`shuffleArray`) |
| `game/model/hand.ts` | ⚠️ | `~/db` (тип `GameUtilsParsed`) |
| `game/model/hands.ts` | ⚠️ | `~/db` (тип), `~/shared/lib` (`shuffleArray`) |
| `game/utils/logs.ts` | ❌ | `~/db` (рантайм `ORM`!), `~/shared/lib` (`escapeHtml`) |
| `game/services/types.ts` | ❌ | `~/core` (`CallbackCtx` из grammy), `~/db` |
| `game/services/game-utils.service.ts` | ⚠️ типы | `~/db` (типы) |
| `game/services/game-logic.service.ts` | ❌ | оркестрирует Telegram-нотификации (`game-notifications.service`) |
| `game/services/game-notifications.service.ts` | ❌❌ | `~/db` (`ORM`), `~/shared/lib`, `~/shared/ui/game` (тексты, клавиатуры) |
| `game/game.ts` | ❌❌❌ | `~/db` (`DB`+`ORM`), `~/core` (`BOT`, `logGameEvent`), `~/shared/plugins` (`dayjs`), `~/shared/ui/game`, `services` |

### Категории зависимостей и тактика

1. **Доменные типы, ошибочно лежащие в `~/db`** (`GameId`, `UserId`, `*Schema`, `GameLog`, `GameUtils`, `GameUtilsParsed`).
   → Их место в `shared`. Это разворот зависимости: `~/db` будет импортировать из `shared`, а не наоборот.
2. **Рантайм `ORM`/`DB` внутри сущностей** (`game.ts`, `notifications`, `utils/logs.ts`).
   → `shared` не должен знать про БД. Инвертировать: либо передавать данные внутрь, либо ввести порт `GameRepo`/`Notifier` (интерфейс в `shared`, реализация в боте).
3. **`~/core` (grammy транспорт)** — `BOT`, `CallbackCtx`, `logGameEvent`.
   → Не должно быть в `shared` вообще. Сигнал, что `game.ts` и `services/*` совмещают домен и transport.
4. **`~/shared/ui/game`** (тексты, клавиатуры) — Telegram presentation.
   → Остаётся в боте. Из домена убрать.
5. **`~/shared/lib`**: `escapeHtml` — Telegram, остаётся в боте; `shuffleArray` — чистая, переезжает в `shared`; `Achievements` — доменная константа, переезжает в `shared`.
6. **`~/shared/plugins/dayjs`** — настроенный singleton. Принимать `Dayjs` извне или унести в `shared`.

### Шаги фазы 2 (порядок снизу вверх)

1. **Подготовить `packages/shared`**: tsconfig, package.json, экспорт через `@athanasius/shared`.
2. **Перенести `deck/*`** — почти чистый, валидация подхода. Бот переключается на `@athanasius/shared`.
3. **Вынести доменные типы из `~/db` в `shared`** (`GameId`, `UserId`, `*Schema`, `GameLog`, `GameUtils`, `GameUtilsParsed`); `~/db` импортирует обратно.
4. **Перенести `shuffleArray` и `Achievements`** в `shared`.
5. **Перенести `game/model/*`** (`hand`, `hands`, `queue`) — после п.3-4 чистые.
6. **Перенести `game/types.ts`, `game/utils/mailing.ts`, `services/game-utils.service.ts`** — типы и чистые утилиты.
7. **Изолировать чистую логику из `game-logic.service.ts`** (`adjustCount`, `getNewSuits`, ход) — в `shared`. Telegram-оркестрация остаётся в боте.
8. **Рефакторинг `game.ts` + `notifications`**: ввести порты `GameRepo`, `Notifier`, `Logger`, `Clock`. Реализация — в боте, интерфейсы и `Game`-агрегат — в `shared`. `utils/logs.ts` теряет прямой `ORM`.
9. **`utils/mailing.ts`** — переезжает следом.
10. **Бот импортирует всё через `@athanasius/shared`**, тесты (`pnpm test`) зелёные.

### Критерий готовности фазы

`packages/shared/` не содержит ни одного импорта из `grammy`, `~/db`, `~/core`, `~/shared/ui`. `pnpm test` зелёный. Бот собирается и запускается, игровой флоу работает end-to-end.

### Не входит в скоуп фазы 2

- Смена правил игры, формата логов, формата `Athanasius`.
- Замена LowDB / схемы `db.json` (это фаза 3).
- Любые изменения презентации в Telegram (тексты, клавиатуры).

## Фаза 3: packages/api
- Fastify + Drizzle ORM + better-sqlite3
- `@fastify/websocket` для real-time (заложить сразу)
- Вся работа с БД переезжает сюда (из `packages/bot/src/db`)
- REST API поверх игровой логики
- Бот становится HTTP-клиентом API

## Фаза 4: packages/web (Telegram Mini App)
- Vite + React (или другой фреймворк)
- Telegram WebApp SDK
- Постепенный переезд игрового UI из inline keyboards в Mini App
- Порядок: просмотр руки → ход → комнаты

---

## Архитектура (целевая)

```
packages/
  bot/      → HTTP клиент → api; Telegram transport
  api/      → Fastify + Drizzle + SQLite; WebSocket
  web/      → Telegram Mini App; HTTP + WS клиент
  shared/   → game entities, типы, константы (без IO)
```

Зависимости только в одну сторону: `bot`, `api`, `web` → `shared`. `shared` ни от кого не зависит.

## Деплой (целевой)
- Ubuntu + nvm + pm2
- `bot` и `api` — отдельные pm2 процессы
- `web` — статика, раздаётся через `api` или отдельный nginx
