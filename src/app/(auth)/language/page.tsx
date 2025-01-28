"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie"; // Import js-cookie
import * as translations from "../../../../public/locales/translations";

export default function LanguagePage() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  // Extract language names from translations
  const languages = Object.entries(translations.languageNames).map(([code, name]) => ({
    code,
    name,
  }));

  useEffect(() => {
    // Retrieve selected language from cookies
    const storedLanguage = Cookies.get("selectedLanguage");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
    }
  }, []);

  const handleLanguageSelection = (languageCode: string) => {
    // Update selected language and store in cookies
    setSelectedLanguage(languageCode);
    Cookies.set("selectedLanguage", languageCode, { expires: 7 }); // Expires in 7 days
    router.push("/mongodb-setup");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">
          Select Your Language
        </h1>
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
    </div>
  );
}
