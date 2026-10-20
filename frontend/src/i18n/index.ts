import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import rw from './locales/rw.json'
import fr from './locales/fr.json'

export const SUPPORTED_LANGUAGES = ['en', 'rw', 'fr'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: SupportedLanguage = 'rw'

const STORAGE_KEY = 'bika_wunguke_lang'

export function getStoredLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
      return stored as SupportedLanguage
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_LANGUAGE
}

export function setStoredLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // localStorage unavailable
  }
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      rw: { translation: rw },
      fr: { translation: fr },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  })
  .catch((error) => {
    console.error('[i18n] failed to initialise, falling back to defaults', error);
  })

export function changeLanguage(lang: SupportedLanguage): void {
  setStoredLanguage(lang)
  void i18n.changeLanguage(lang).catch((error) => {
    console.error('[i18n] failed to change language', error)
  })
}

export default i18n
