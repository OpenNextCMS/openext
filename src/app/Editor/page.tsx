"use client"

import Editor from "@/components/editor/editor"
import { ThemeProvider } from "next-themes"

export default function LayoutWrapper() {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="h-screen bg-background text-foreground transition-colors">
                <Editor />
            </div>
        </ThemeProvider>
    )
}
