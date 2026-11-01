import { createCookie } from "react-router";
import type { Locale } from "./locale";

export const languageCookie = createCookie("striped-skins-language", {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 365 * 24 * 60 * 60,
});

export async function readLanguagePreference(request: Request): Promise<Locale | null> {
  try {
    const value: unknown = await languageCookie.parse(request.headers.get("Cookie"));
    return value === "en" || value === "ru" ? value : null;
  } catch {
    return null;
  }
}

export function saveLanguagePreference(request: Request, preference: Locale | "auto") {
  return languageCookie.serialize(preference === "auto" ? "" : preference, {
    secure: new URL(request.url).protocol === "https:",
    ...(preference === "auto" ? { maxAge: 0 } : {}),
  });
}
