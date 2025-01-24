// src/components/LanguageSelector.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LanguageConfig } from "@/types";

const LanguageSelector: React.FC = () => {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  const languages: LanguageConfig[] = [
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "es", name: "Español" },
    { code: "de", name: "Deutsch" },
    { code: "ar", name: "العربية" },
    { code: "hi", name: "हिन्दी" },
    { code: "zh", name: "中文" },
    { code: "pt", name: "Português" },
    { code: "ru", name: "Русский" },
    { code: "it", name: "Italiano" },
  ];

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
    }
  }, []);

  const handleLanguageSelection = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    localStorage.setItem("selectedLanguage", languageCode);
    router.push("/mongodb-setup");
  };

  return (
    <div className="language-selector-container">
      <h2 className="text-2xl font-bold text-center mb-6">
        Select Your Language
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelection(lang.code)}
            className={`p-4 rounded-lg transition-all duration-300 ${
              selectedLanguage === lang.code
                ? "bg-blue-500 text-white scale-105"
                : "bg-gray-100 hover:bg-blue-100 hover:scale-105"
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
