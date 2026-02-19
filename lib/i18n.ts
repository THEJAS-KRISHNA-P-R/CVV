/**
 * Internationalization Utility
 * Client-side translation helper
 */

import { Locale } from '@/i18n.config'

type TranslationValue = string | Record<string, string>

export async function getTranslation(locale: Locale) {
  const translations = await import(`@/public/locales/${locale}.json`)
  return translations.default
}

export function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, prop) => current?.[prop], obj) || path
}

export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] || match)
}
