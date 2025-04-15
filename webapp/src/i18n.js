import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

import translationEn from "./locales/en/translation.json";
import translationEs from "./locales/es/translation.json";

i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .use(Backend)
    .init({
        fallbackLng: "en",
        resources: {
            en: { translation: translationEn },
            es: { translation: translationEs },
        },
        interpolation: {
        escapeValue: false,
        },
    })

export default i18next;