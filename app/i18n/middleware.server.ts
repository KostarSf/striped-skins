import { createI18nextMiddleware } from "remix-i18next";
import { fallbackLanguage, i18nOptions, supportedLanguages } from "./config";
import { detectLocale } from "./locale";
import type { MiddlewareFunction } from "react-router";
import { readLanguagePreference } from "./preference.server";

// Normalize regions before matching, preserving the complete Accept-Language preference list.
// An explicit preference takes priority over browser language negotiation.
const [detectLanguage, getLocale, getInstance] = createI18nextMiddleware({
  detection: {
    supportedLanguages: [...supportedLanguages],
    fallbackLanguage,
    order: ["custom"],
    findLocale: async ({ request }) =>
      (await readLanguagePreference(request)) ??
      detectLocale(request.headers.get("Accept-Language")),
  },
  i18next: i18nOptions,
});

export { getLocale, getInstance };

export const i18nextMiddleware: MiddlewareFunction<Response> = (args, next) =>
  detectLanguage(args, async () => {
    const response = await next();
    response.headers.set("Content-Language", getLocale(args.context));
    for (const name of ["Accept-Language", "Cookie"]) {
      const vary = response.headers.get("Vary");
      if (!vary?.split(",").some((header) => header.trim().toLowerCase() === name.toLowerCase()))
        response.headers.append("Vary", name);
    }
    return response;
  });
