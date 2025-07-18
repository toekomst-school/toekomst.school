import { init, register, locale, isLoading } from 'svelte-i18n';

const defaultLocale = 'nl';

// Register locales
register('en', () => import('./locales/en.json'));
register('nl', () => import('./locales/nl.json'));

// Initialize i18n with default locale
init({
	fallbackLocale: defaultLocale,
	initialLocale: defaultLocale,
});

// Ensure locale is set immediately and wait for it to load
locale.set(defaultLocale);

// Export for convenience
export { _ } from 'svelte-i18n';