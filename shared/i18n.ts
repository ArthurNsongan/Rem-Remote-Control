import { useCallback, useEffect, useState } from "react";

export type Lang = "fr" | "en";

const KEY = "rem_lang";

/**
 * Français uniquement si la machine est en français ; anglais par défaut.
 *
 * Un choix explicite de l'utilisateur, mémorisé, l'emporte sur la détection.
 * `navigator.languages` reflète la locale du système, aussi bien dans la
 * WebView Tauri que dans le navigateur du téléphone.
 */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    // Stockage indisponible (navigation privée) : on retombe sur la détection.
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith("fr")) ? "fr" : "en";
}

type Dict<K extends string> = Record<Lang, Record<K, string>>;

/**
 * Construit le hook de traduction d'une app à partir de son dictionnaire.
 *
 * `t("clef", { n: 3 })` remplace les `{n}` du libellé. Les clefs sont typées
 * d'après le dictionnaire français, qui fait référence : une clef traduite
 * d'un seul côté ne compile pas.
 */
export function createI18n<K extends string>(dict: Dict<K>) {
  return function useI18n() {
    const [lang, setLangState] = useState<Lang>(detectLang);

    // `lang` du document : césure, correcteurs et lecteurs d'écran s'en servent.
    useEffect(() => {
      document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((l: Lang) => {
      setLangState(l);
      try {
        localStorage.setItem(KEY, l);
      } catch {
        // Le choix ne survivra pas au redémarrage, sans plus.
      }
    }, []);

    const t = useCallback(
      (k: K, vars?: Record<string, string | number>) => {
        let s = dict[lang][k] ?? k;
        if (vars) {
          for (const [name, val] of Object.entries(vars)) {
            s = s.replace(`{${name}}`, String(val));
          }
        }
        return s;
      },
      [lang]
    );

    return { lang, setLang, t };
  };
}

export type I18n<K extends string> = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: K, vars?: Record<string, string | number>) => string;
};
