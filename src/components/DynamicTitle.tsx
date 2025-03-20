"use client";

import { useEffect, useState } from "react";

export default function DynamicTitle() {
    const [title, setTitle] = useState("Loading...");
    // const [desc, setDesc] = useState("Loading...");

    useEffect(() => {
        async function fetchTitle() {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"
                const res = await fetch(`${backendUrl}/api/dashboard/settings`);
                const data = await res.json();
                setTitle(data?.data?.settings?.siteTitle || "Next.js Setup Project");
                // setDesc(data?.data?.settings?.description || "Comprehensive Next.js Project Setup");
            } catch (error) {
                console.error("Failed to fetch site title:", error);
                setTitle("Next.js Setup Project");
                // setDesc("Comprehensive Next.js Project Setup");
            }
        }

        fetchTitle();
    }, []);

    useEffect(() => {
        document.title = title;
    }, [title]);

    return null;
}
