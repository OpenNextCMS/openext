'use client';

import { use } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';
import BlogEditor from '@/components/blog/editor/BlogEditor';

/**
 * Dedicated blog post editor (block-based, separate from the visual /Editor).
 * Route: /dashboard/blogs/[id]/edit  — use id "new" to create a post.
 */
export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BlogEditor id={id} />
      </PersistGate>
    </Provider>
  );
}
