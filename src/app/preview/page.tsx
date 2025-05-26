// app/preview/page.tsx

import React, { Suspense } from 'react';
import PreviewPage from './PreviewPage'; // move your component to a separate file (PreviewPage.tsx)

export default function PreviewWrapper() {
  return (
    <Suspense fallback={<div className="p-6">Loading preview...</div>}>
      <PreviewPage />
    </Suspense>
  );
}
