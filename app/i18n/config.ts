import type { InitOptions } from "i18next";
import en from "./en";
import ru from "./ru";

import { fallbackLanguage, supportedLanguages } from "./locale";
export { fallbackLanguage, supportedLanguages } from "./locale";
export const resources = { en: { translation: en }, ru: { translation: ru } };
export const i18nOptions = {
  resources,
  supportedLngs: [...supportedLanguages],
  fallbackLng: fallbackLanguage,
  defaultNS: "translation",
  keySeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
} satisfies InitOptions;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    keySeparator: false;
    resources: { translation: typeof en };
  }
}
