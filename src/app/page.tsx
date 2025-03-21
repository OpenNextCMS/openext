"use client"; // Ensure this runs only on the client side

import { useEffect, useState } from "react";
import ThemeLoader from "@/components/ThemeLoader";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function Home() {
  const [themeName, setThemeName] = useState<string | null>(null);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/themes/get-theme`);
        if (!response.ok) throw new Error("Failed to fetch theme");
        const { themeName } = await response.json();
        setThemeName(themeName);
      } catch (error) {
        console.error("Error fetching theme:", error);
      }
    };

    fetchTheme();
  }, []);

  if (!themeName) return <p>Loading theme...</p>; // Prevent rendering until theme is loaded

  return <ThemeLoader themeName={themeName} />;
}
