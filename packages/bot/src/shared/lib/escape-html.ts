const HTML_ESCAPE_MAP = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
} as const;

export const escapeHtml = (text: string): string => {
	return text.replace(/[&<>]/g, char => HTML_ESCAPE_MAP[char as keyof typeof HTML_ESCAPE_MAP]);
};
