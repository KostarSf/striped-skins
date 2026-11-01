export const supportedLanguages = ["en", "ru"] as const;
export type Locale = (typeof supportedLanguages)[number];
export const fallbackLanguage: Locale = "en";

/** Match base languages in preference order, ignoring unsupported and excluded entries. */
export function detectLocale(header: string | null): Locale {
  const preferences = (header ?? "")
    .split(",")
    .map((entry) => {
      const [tag, ...parameters] = entry.trim().split(";");
      const quality = parameters.find((parameter) => /^q\s*=/.test(parameter.trim()));
      const rawWeight = quality?.split("=")[1]?.trim();
      const weight = rawWeight === undefined ? 1 : Number(rawWeight);
      if (rawWeight !== undefined && !/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(rawWeight))
        return null;
      if (!tag || weight <= 0) return null;
      try {
        const language = new Intl.Locale(tag).language;
        const locale = supportedLanguages.find((supported) => supported === language);
        return locale ? { locale, weight } : null;
      } catch {
        return null;
      }
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => b.weight - a.weight);
  return preferences[0]?.locale ?? fallbackLanguage;
}
