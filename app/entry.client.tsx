import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { fallbackLanguage, i18nOptions, supportedLanguages } from "./i18n/config";

async function hydrate() {
  const language = document.documentElement.lang;
  const i18n = createInstance();
  await i18n.init({
    ...i18nOptions,
    lng: supportedLanguages.find((locale) => locale === language) ?? fallbackLanguage,
  });
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <HydratedRouter />
        </I18nextProvider>
      </StrictMode>,
    );
  });
}

void hydrate();
