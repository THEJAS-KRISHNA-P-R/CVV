/**
 * Internationalization Configuration
 * Supports English and Malayalam
 */

export const locales = ['en', 'ml'] as const
export const defaultLocale = 'en' as const

export type Locale = (typeof locales)[number]

export function isValidLocale(locale: unknown): locale is Locale {
  return typeof locale === 'string' && locales.includes(locale as any)
}
