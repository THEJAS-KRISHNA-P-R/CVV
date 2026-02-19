import { getRequestConfig } from 'next-intl/server'
import { locales, defaultLocale } from '../i18n.config'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: (await import(`../public/locales/${locale}.json`)).default,
  }
})
