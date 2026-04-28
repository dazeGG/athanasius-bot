/* VALIDATION TEXTS */
import { DB } from '~/db';

const VALIDATION_TEXTS = {
	nameLessThan4: 'Имя не должно быть короче 2 символов',
	nameMoreThan16: 'Имя не должно быть длиннее 16 символов',
	nameAlreadyUsed: 'Это имя уже используется, попробуй другое',
	invalidName: 'Это имя нельзя взять, попробуй другое',
	invalidCharacters: 'Имя может содержать только русские буквы, дефис и нижнее подчеркивание',
	validName: 'Это имя полностью подходит',
} as const;

const RESERVED_NAMES = ['имя', 'вовощ'];
const normalizeName = (name: string): string => name.toLowerCase();

export const validateName = (name: string, currentUserId?: number): { success: boolean; message: string } => {
	const normalizedName = normalizeName(name);

	if (name.length < 2) {
		return { success: false, message: VALIDATION_TEXTS.nameLessThan4 };
	}

	if (name.length > 16) {
		return { success: false, message: VALIDATION_TEXTS.nameMoreThan16 };
	}

	if (!/^[а-яёА-ЯЁ_-]+$/.test(name)) {
		return { success: false, message: VALIDATION_TEXTS.invalidCharacters };
	}

	if (DB.data.users.find(u => normalizeName(u.name) === normalizedName && u.id !== currentUserId)) {
		return { success: false, message: VALIDATION_TEXTS.nameAlreadyUsed };
	}

	if (RESERVED_NAMES.includes(normalizedName)) {
		return { success: false, message: VALIDATION_TEXTS.invalidName };
	}

	return { success: true, message: VALIDATION_TEXTS.validName };
};
