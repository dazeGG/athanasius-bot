/* VALIDATION TEXTS */
const validationTexts = {
	nameLessThan4: 'Имя не должно быть короче 4 символов',
	nameMoreThan16: 'Имя не должно быть длиннее 16 символов',
	invalidName: 'Это имя нельзя взять, попробуй другое',
	validName: 'Это имя полностью подходит',
} as const;

export const validateName = (name: string): { success: boolean; message: string } => {
	if (name.length < 4) {
		return { success: false, message: validationTexts.nameLessThan4 };
	}

	if (name.length > 16) {
		return { success: false, message: validationTexts.nameMoreThan16 };
	}

	if (name.toLowerCase() === 'имя') {
		return { success: false, message: validationTexts.invalidName };
	}

	return { success: true, message: validationTexts.validName };
};
