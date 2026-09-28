let languageProvider: () => string = () => 'zh-CN'

export function setLanguageProvider(provider: () => string): void {
  languageProvider = provider
}

export const Locales = { getLanguage: () => languageProvider() }
export const Log = console
