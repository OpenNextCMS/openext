"use client";

import React, { useState, useEffect, useRef } from "react";
import grapesjs from "grapesjs";
import gjsPreset from "grapesjs-preset-webpage";
import gjsBlocks from "grapesjs-blocks-basic";
import gjsForms from "grapesjs-plugin-forms";
import gjsNavbar from "grapesjs-navbar";
import gjsCountdown from "grapesjs-component-countdown";
import gjsTabs from "grapesjs-tabs";
import gjsCustomCode from "grapesjs-custom-code";
import gjsTooltip from "grapesjs-tooltip";
import gjsTyped from "grapesjs-typed";
import gjsStyleBg from "grapesjs-style-bg";
import { useRouter } from "next/navigation";

// Remove the direct CSS import and handle it in useEffect

const GrapeJSEditor: React.FC = () => {
  const router = useRouter();
  const [editor, setEditor] = useState<any>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load GrapeJS CSS dynamically
    const loadGrapesJsStyles = async () => {
      if (typeof window !== 'undefined') {
        const link = document.createElement('link');
        link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css';
        link.type = 'text/css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    };
    loadGrapesJsStyles();
  }, []);

  useEffect(() => {
    const savedTitle = localStorage.getItem("siteTitle");
    if (savedTitle) {
      setSiteTitle(savedTitle);
      setSavedTitle(savedTitle);
      setIsEditingTitle(false);
    }
  }, []);

  useEffect(() => {
    if (!editor && editorRef.current) {
      const e = grapesjs.init({
        container: editorRef.current,
        height: "calc(100vh - 180px)",
        width: "auto",
        plugins: [
          gjsPreset,
          gjsBlocks,
          gjsForms,
          gjsNavbar,
          gjsCountdown,
          gjsTabs,
          gjsCustomCode,
          gjsTooltip,
          gjsTyped,
          gjsStyleBg,
        ],
        pluginsOpts: {
          gjsPreset: {},
        },
        storageManager: false,
        panels: { defaults: [] },
      });
      setEditor(e);
    }

    return () => {
      if (editor) {
        editor.destroy();
        setEditor(null);
      }
    };
  }, [editor]);

  const handleSiteTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSiteTitle(e.target.value);
  };

  const handleSaveTitle = () => {
    localStorage.setItem("siteTitle", siteTitle);
    setSavedTitle(siteTitle);
    setIsEditingTitle(false);
  };

  const handleEditTitle = () => {
    setIsEditingTitle(true);
  };

  const handleSaveToDb = async () => {
    try {
      if (!savedTitle) {
        alert('Please save the site title first');
        return;
      }

      const htmlContent = editor.getHtml();
      const cssContent = editor.getCss();
      const components = editor.getComponents();
      const styles = editor.getStyle();

      const pageData = {
        siteName: savedTitle,
        pageName: "Untitled Page",
        data: {
          html: htmlContent,
          css: cssContent,
          components: components.toJSON(),
          styles: styles.toJSON(),
        },
      };

      // First try to update
      let response = await fetch("/api/pages/create", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pageData),
        credentials: 'include',
      });

      // If page doesn't exist, create new one
      if (response.status === 404) {
        response = await fetch("/api/pages/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pageData),
          credentials: 'include',
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save page');
      }

      console.log("Page saved successfully:", data);
      alert('Page saved successfully!');

    } catch (error) {
      console.error("Error saving page:", error);
      alert(error instanceof Error ? error.message : 'Failed to save page');
    }
  };

  const handleExitEditor = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="p-6 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center space-x-4">
          {isEditingTitle ? (
            <>
              <input
                type="text"
                placeholder="Enter site title"
                value={siteTitle}
                onChange={handleSiteTitleChange}
                className="max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSaveTitle}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Save Title
              </button>
            </>
          ) : (
            <>
              <span className="text-lg font-medium">{savedTitle}</span>
              <button
                onClick={handleEditTitle}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Edit Title
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-grow p-6">
        <div ref={editorRef} className="bg-white rounded-lg shadow-md" />
      </div>

      <div className="p-6 bg-white shadow-lg border-t">
        <div className="max-w-7xl mx-auto flex justify-end space-x-4">
          <button
            onClick={handleSaveToDb}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Save to Database
          </button>
          <button
            onClick={handleExitEditor}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Exit Editor
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrapeJSEditor;