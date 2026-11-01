import { createI18nextMiddleware } from "remix-i18next";
import { fallbackLanguage, i18nOptions, supportedLanguages } from "./config";
import { detectLocale } from "./locale";
import type { MiddlewareFunction } from "react-router";

// Normalize regions before matching, preserving the complete Accept-Language preference list.
// A persisted preference can be added here later without changing translation consumers.
const [detectLanguage, getLocale, getInstance] = createI18nextMiddleware({
  detection: {
    supportedLanguages: [...supportedLanguages],
    fallbackLanguage,
    order: ["custom"],
    findLocale: async ({ request }) => detectLocale(request.headers.get("Accept-Language")),
  },
  i18next: i18nOptions,
});

export { getLocale, getInstance };

export const i18nextMiddleware: MiddlewareFunction<Response> = (args, next) =>
  detectLanguage(args, async () => {
    const response = await next();
    response.headers.set("Content-Language", getLocale(args.context));
    const vary = response.headers.get("Vary");
    if (!vary?.split(",").some((header) => header.trim().toLowerCase() === "accept-language"))
      response.headers.append("Vary", "Accept-Language");
    return response;
  });
