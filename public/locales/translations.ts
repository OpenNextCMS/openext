import { ar } from "./ar.language";
import { bn } from "./bn.language";
import { de } from "./de.language";
import { en } from "./en.language";
import { es } from "./es.language";
import { fr } from "./fr.language";
import { hi } from "./hi.language";
import { it } from "./it.language";
import { kn } from "./kn.language";
import { mr } from "./mr.language";
import { ne } from "./ne.language";
import { pt } from "./pt.language";
import { ru } from "./ru.language";
import { ta } from "./ta.language";
import { zh } from "./zh.language";

export const translations = {
  en,
  hi,
  es,
  de,
  ar,
  zh,
  ru,
  it,
  fr,
  pt,
  mr,
  bn,
  ne,
  kn,
  ta,
};

export const languageNames = {
  en: "English",
  hi: "हिन्दी",
  es: "Español", 
  de: "Deutsch",
  ar: "العربية",
  zh: "中文",
  ru: "Русский",
  it: "Italiano",
  fr: "Français",
  pt: "Português",
  mr: "मराठी",
  bn: "বাংলা",
  ne: "नेपाली", 
  kn: "ಕನ್ನಡ",
  ta: "தமிழ்"
};

export type TranslationKey = keyof (typeof translations)["en"];