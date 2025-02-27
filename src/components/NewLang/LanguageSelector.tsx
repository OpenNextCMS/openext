"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie"; // Import js-cookie
import * as translations from "../../../public/locales/translations"; // Import translations

// Convert translations into an array of objects
const languages = Object.entries(translations.languageNames).map(([code, name]) => ({
  code,
  name,
  flag: `/flags/${code}.png`,
}));

export default function LanguageSelector() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial language from cookies or default to English
  const [selectedLang, setSelectedLang] = useState(
    languages.find((lang) => lang.code === (Cookies.get("selectedLanguage") || "en")) || languages[0]
  );
  const [inputValue, setInputValue] = useState(selectedLang.name);
  const [t, setT] = useState<{ [key: string]: any }>(translations?.translations?.en);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    Cookies.set("selectedLanguage", selectedLang.code, { expires: 7 });
    setT(translations.translations[selectedLang.code as keyof typeof translations.translations] as { [key: string]: any });
  }, [selectedLang]);

  const handleLanguageSelect = (lang: { code: string; name: string; flag: string }) => {
    setSelectedLang(lang);
    setInputValue(lang.name);
    Cookies.set("selectedLanguage", lang.code, { expires: 7 });
    setT(translations.translations[lang.code as keyof typeof translations.translations] as { [key: string]: any });
    setIsOpen(false);
  };

  const handleSubmit = () => {
    router.push("/mongodb-setup");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col justify-center items-center px-4 sm:px-6 md:px-10 lg:px-16 py-6">
      <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl" ref={dropdownRef}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 w-full">
          {/* Fixed-width language label */}
          <p className="w-48 text-right">
            {t.selectLanguage}:
          </p>

          {/* Input field and dropdown button */}
          <div className="relative w-full">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="w-full min-w-40 max-w-64 sm:max-w-80 md:max-w-96 lg:max-w-lg px-4 py-2 bg-white border border-black rounded shadow-lg focus:outline-none"
              placeholder="Select a language"
            />
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="absolute right-3 top-2.5 w-6 h-7 focus:outline-none"
            >
              <ChevronDown
                className={`transition-transform ${isOpen ? "rotate-180" : "rotate-0"} duration-300`}
              />
            </button>
          </div>

          {/* Fixed-width button */}
          <button
            onClick={handleSubmit}
            className="w-28 sm:w-36 px-3 sm:px-6 py-2 sm:py-3 bg-black border border-black text-white rounded-lg shadow-lg hover:text-black hover:bg-transparent transition-all duration-500"
          >
            {t.continue}
          </button>
        </div>

        {/* Language dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.ul
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg overflow-y-auto max-h-60 duration-300 scrollbar-hide z-10"
            >
              {languages.map((lang) => (
                <motion.li
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang)}
                  className="flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-purple-100 transition-all duration-200"
                >
                  <Image src={lang.flag} alt={lang.name} width={20} height={20} />
                  <span className="text-base text-gray-800">{lang.name}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
