'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HelloWorldPage() {
  const [pageData, setPageData] = useState<{ html: string, css: string } | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const response = await fetch('/api/page-data');
        if (!response.ok) {
          throw new Error('Failed to fetch page data');
        }
        const data = await response.json();
        console.log('Fetched page data:', data); // Log the fetched page data
        setPageData(data.data); // Access the nested data object
      } catch (error) {
        setError(error.message);
      }
    };

    fetchPageData();
  }, []);

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span dangerouslySetInnerHTML={{ __html: error }}></span>
        </div>
      )}
      {pageData && pageData.html && pageData.css && (
        <div>
          <style>{pageData.css}</style>
          <div dangerouslySetInnerHTML={{ __html: pageData.html }}></div>
          <a
            href="about:blank"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              const newWindow = window.open();
              if (newWindow) {
                newWindow.document.open();
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Page Data</title>
                    <style>${pageData.css}</style>
                  </head>
                  <body>
                    ${pageData.html}
                  </body>
                  </html>
                `);
                newWindow.document.close();
              }
            }}
            className="text-blue-500 underline mt-4 block"
          >
            Open in new tab
          </a>
        </div>
      )}
    </div>
  );
}
