# athanasius-bot

Telegram-бот для игры в «Афанасия» в комнатах. Проект написан на TypeScript, использует `grammy` в режиме long polling и хранит рабочее состояние в `lowdb` через локальный файл `db.json`.

## Стек

- TypeScript
- Node.js `v22.5.1` из [.nvmrc](/Users/daze/Desktop/WORK/pet/athanasius-bot/.nvmrc)
- `grammy`
- `lowdb`
- `winston`
- `pnpm`

## Что умеет бот

Бот позволяет:

- Регистрировать игроков с уникальными именами;
- Создавать комнаты и входить в них по коду;
- Настраивать комнату перед стартом матча;
- Запускать игру в «Афанасия» при наличии минимум 3 игроков;
- Смотреть свою руку во время активной игры;
- Получать игровые уведомления и итоговые результаты в Telegram.

Целевое поведение игры и правила для ИИ-агентов описаны в [AGENTS.md](/Users/daze/Desktop/WORK/pet/athanasius-bot/AGENTS.md) и [CLAUDE.md](/Users/daze/Desktop/WORK/pet/athanasius-bot/CLAUDE.md).

## Правила игры

Целевое поведение продукта сейчас такое:

1. Для старта игры в комнате должно быть минимум 3 игрока.
2. В игре используется `decksCount` стандартных колод по 52 карты.
3. Все карты перемешиваются вместе и раздаются игрокам по кругу.
4. Очередность хода случайно определяется один раз в начале партии.
5. В свой ход активный игрок выбирает:
   - Другого игрока, у которого ещё есть карты;
   - Ранг, который уже есть у него в руке;
   - Общее количество карт этого ранга у цели;
   - Расклад по цветам: красные и чёрные;
   - Точный расклад по мастям.
6. Нельзя спрашивать ранг, которого нет у тебя в руке.
7. Нельзя выбирать целью игрока, у которого закончились карты.
8. Кража считается успешной только если всё заявление полностью точное.
9. При успехе все карты названного ранга переходят от цели к активному игроку.
10. После успешной кражи игрок продолжает ходить, если только после кражи его рука не опустела, а игра ещё не закончилась.
11. «Афанасий» считается собранным, когда игрок собрал полный комплект одного ранга из всех колод, то есть `decksCount * 4` карт одного ранга.
12. Собранные «Афанасии» автоматически убираются из руки и идут в счёт.
13. Игроки без карт пропускаются в очереди ходов.
14. Игра заканчивается, когда ни у одного игрока не остаётся карт в руке.
15. Победители определяются по числу собранных «Афанасиев».

## Структура проекта

Основные директории:

- [src/core](/Users/daze/Desktop/WORK/pet/athanasius-bot/src/core) — инфраструктура бота, регистрация хендлеров, состояния, логгер, общая обвязка.
- [src/modules](/Users/daze/Desktop/WORK/pet/athanasius-bot/src/modules) — пользовательские модули Telegram: регистрация, комнаты, настройки, просмотр руки, старт, игровые хендлеры.
- [src/entities/deck](/Users/daze/Desktop/WORK/pet/athanasius-bot/src/entities/deck) — описание колоды, карт и вспомогательных операций.
- [src/entities/game](/Users/daze/Desktop/WORK/pet/athanasius-bot/src/entities/game) — доменная логика игры, руки, очередь, обработка ходов, уведомления и логи.
- [src/shared](/Users/daze/Desktop/WORK/pet/athanasius-bot/src/shared) — общие тексты, клавиатуры, плагины и утилиты.
- [src/db](/Users/daze/Desktop/WORK/pet/athanasius-bot/src/db) — настройка `lowdb`, схемы и ORM-подобный слой доступа к данным.

## Локальная разработка

### Что нужно заранее

- `nvm`
- Node.js версии из `.nvmrc`
- `pnpm`

### Установка

```bash
nvm install
nvm use
corepack enable
pnpm install
```

### Переменные окружения

В репозитории есть шаблон [.env.example](/Users/daze/Desktop/WORK/pet/athanasius-bot/.env.example).

Скопируй его в `.env`:

```bash
cp .env.example .env
```

После этого открой `.env` и укажи токен Telegram-бота:

```env
BOT_TOKEN=your_telegram_bot_token
```

Как с этим работать:

- `.env.example` хранится в репозитории как шаблон без секретов;
- `.env` используется локально и на сервере как реальный конфиг;
- в `BOT_TOKEN` нужно подставить токен, который выдал BotFather;
- без корректного `BOT_TOKEN` бот не сможет запуститься.

### Запуск

Режим разработки с автоперезапуском:

```bash
pnpm dev
```

Запуск в обычном режиме:

```bash
pnpm start
```

Линтер:

```bash
pnpm lint
```

Проверка типов:

```bash
pnpm typecheck
```

Симулятор сценариев и регрессий:

```bash
pnpm test
```

## Особенности рантайма

- Бот работает через Telegram long polling, не через webhooks.
- Состояние игры хранится в [db.json](/Users/daze/Desktop/WORK/pet/athanasius-bot/db.json).
- Ошибки пишутся в директорию [logs](/Users/daze/Desktop/WORK/pet/athanasius-bot/logs) с ежедневной ротацией.
- Процессу нужны права на запись в `db.json` и `logs/`.

## Деплой на Ubuntu через `nvm` и `pm2`

### 1. Установить системные пакеты

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

### 2. Установить `nvm`

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
```

### 3. Клонировать проект и поставить Node.js

```bash
git clone <your-repo-url>
cd athanasius-bot
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
```

### 4. Настроить окружение

Скопируй шаблон:

```bash
cp .env.example .env
```

Заполни `.env`:

```env
BOT_TOKEN=your_telegram_bot_token
```

Убедись, что рабочие файлы и директории существуют:

```bash
mkdir -p logs
test -f db.json || printf '{\"users\":[],\"rooms\":[],\"games\":[]}\n' > db.json
```

### 5. Установить `pm2`

```bash
pnpm add -g pm2
```

### 6. Запустить бота через `pm2`

```bash
pm2 start pnpm --name athanasius-bot -- start
```

### 7. Сохранить автозапуск после перезагрузки

```bash
pm2 save
pm2 startup
```

Выполни команду, которую выведет `pm2 startup`, затем ещё раз сохрани конфигурацию:

```bash
pm2 save
```

### 8. Полезные команды `pm2`

```bash
pm2 status
pm2 logs athanasius-bot
pm2 restart athanasius-bot
pm2 stop athanasius-bot
```

## Заметки для разработки

- Старайся держать поведение продукта синхронизированным с `AGENTS.md` и `CLAUDE.md`.
- По возможности сохраняй текущее разделение на `core`, `modules`, `entities`, `shared` и `db`.
- Если меняется логика хода, нужно проверять всю цепочку: callback metadata, клавиатуры, тексты стадий, сервисы игры, валидацию руки и уведомления.
