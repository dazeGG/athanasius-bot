# TOFIX

Моменты, которые требуют разбора и фикса в будущем.

---

## 1. Прыгающий layout кнопок +/- при выборе количества

**Файл:** `src/shared/ui/game/keyboards.ts` — `buildSelectKeyboard`

**Проблема:** кнопки `-` и `+` рендерятся условно. Когда одна из них недоступна, оставшаяся висит слева одиноко, и layout визуально сдвигается между шагами.

**Как воспроизвести:** начать ход, дойти до этапа выбора количества карт. При значении `1` кнопка `-` отсутствует — `+` одна слева. Нажать `+` — появляются обе кнопки, layout прыгает.

---

## 2. Два кодпаса проверки active-player в back-хендлере

**Файл:** `src/modules/game/handlers.ts` — `gameTurnBackCallbackHandler`

**Проблема:** ветки `p#` и `c#` используют `resolveActivePlayerForGame` (явный `game.activePlayer.id !== me.id` → `STALE_GAME_MESSAGE`), а ветки `count/colors/suits` — `resolveTurnContext`, который полагается на `validateTurnMeta` с выбросом `InvalidGameFlowError`. Оба пути работают, но это два разных механизма с разной формой сообщений об ошибке в случае расхождений.

**Что сделать:** унифицировать проверку active-player — вероятно, через расширение `resolveTurnContext` или вызов `resolveActivePlayerForGame` перед ним во всех ветках.

---

## 3. Дублирование фабрик callback-ctx в тестах confirmMode

**Файл:** `tests/flow/game/layers/confirm-mode.ts` + `tests/flow/game/helpers.ts`

**Проблема:** три почти идентичные фабрики — `makeTurnCallbackCtx`, `makeConfirmCallbackCtx`, `makeBackCallbackCtx` — различаются только значением `action` (`'t' | 'tc' | 'tb'`) и шаблоном `data`.

**Что сделать:** параметризовать одной фабрикой с аргументом `action`, вынести в `helpers.ts`, убрать дубликаты из слоя.
