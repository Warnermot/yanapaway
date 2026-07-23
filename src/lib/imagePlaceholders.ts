export const PLACEHOLDER_VARIANTS = [
	'img-placeholder--stripes',
	'img-placeholder--dots',
	'img-placeholder--tint-orange',
	'img-placeholder--grid',
	'img-placeholder--tint-teal',
	'img-placeholder--stripes-reverse',
] as const;

export function getPlaceholderVariant(index: number): string {
	return PLACEHOLDER_VARIANTS[index % PLACEHOLDER_VARIANTS.length];
}
