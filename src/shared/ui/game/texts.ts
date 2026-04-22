export const MIN_PLAYERS_TO_START = 3;

/* TEXTS */
export const txt = {
	notStarted: '🔴 <b>Игра ещё не начата</b>',
	ongoing: '🟢 <b>Игра уже идет</b>',
	players: 'Список игроков',
	gameSettings: 'Настройки игры',
	decksCount: 'Количество колод',
	playersCountError: `<b>Чтобы начать игру, необходимо как минимум ${MIN_PLAYERS_TO_START} игрока!</b>`,
	gameStarted: 'Игра началась!',
	gameEnded: 'Игра закончилась!',
	yourChoice: 'Твой выбор',
	player: 'Игрок',
	card: 'Карта',
	cardsCount: 'Количество карт',
	colors: 'Цвета',
	nowSelected: 'Сейчас выбрано',
	firstTurnMessage: 'Ты ходишь первым, выбери у кого хочешь спросить карту',
	turnFirstMessage: '<b>Твой ход!</b>\n' +
		'\n' +
		'Выбери у кого хочешь спросить карту',
	turnCardSelect: 'Выбери какую карту ты хочешь спросить',
	turnCountSelect: 'Выбери сколько карт ты хочешь спросить',
	turnColorsSelect: 'Выбери сколько <b>красных</b> карт ты хочешь спросить',
	turnSuitsSelect: 'Выбери количество мастей, которые ты хочешь спросить',
	redCountError: 'Количество красных мастей не должно быть больше выбранного',
	blackCountError: 'Количество черных мастей не должно быть больше выбранного',
	suitsCountError: 'Количество мастей не должно быть больше выбранного количества карт',
	gameMessageResendSuccess: 'Игровое сообщение успешно отправлено!',
} as const;
